import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '@/lib/api';
import { DEFAULT_CONFIGS } from './defaults';
import type { AppConfigs, BookingRules, ConfigBundle, FeatureFlags } from './types';

export type ConfigRole = 'patient' | 'professional';

type ConfigState = {
  configs: AppConfigs;
  version: string | null;
  /** True once a cached or fresh bundle has been applied (defaults are always usable). */
  hydrated: boolean;
  refresh: () => Promise<void>;
};

const Context = createContext<ConfigState | null>(null);
const cacheKey = (role: ConfigRole) => `mendyr.config.${role}`;
const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Fill every key the served/cached bundle is missing from the bundled defaults, so a
 * partial or older bundle can never crash a screen. */
export function mergeConfigs(served: Partial<Record<string, unknown>> | null | undefined): AppConfigs {
  const merged = { ...DEFAULT_CONFIGS } as Record<string, unknown>;
  if (!served) return merged as AppConfigs;
  for (const key of Object.keys(DEFAULT_CONFIGS)) {
    const value = served[key];
    const fallback = (DEFAULT_CONFIGS as Record<string, unknown>)[key];
    if (isObject(value) && isObject(fallback)) merged[key] = { ...fallback, ...value };
  }
  return merged as AppConfigs;
}

export function ConfigProvider({ role, children }: { role: ConfigRole; children: React.ReactNode }) {
  const [configs, setConfigs] = useState<AppConfigs>(DEFAULT_CONFIGS);
  const [version, setVersion] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);

  const apply = useCallback((bundle: ConfigBundle) => {
    setConfigs(mergeConfigs(bundle.configs as unknown as Record<string, unknown>));
    setVersion(bundle.version ?? null);
    setHydrated(true);
  }, []);

  const refresh = useCallback(() => {
    inFlight.current ??= api<ConfigBundle>(`/configs/app?role=${role}&platform=${platform}`)
      .then(async (bundle) => {
        apply(bundle);
        try {
          await AsyncStorage.setItem(cacheKey(role), JSON.stringify(bundle));
        } catch {
          /* cache is best-effort */
        }
      })
      .catch(() => {
        /* offline or server down — keep cached/default config */
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  }, [role, apply]);

  // Cached bundle first (instant), then a network refresh. Never blocks first paint.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(cacheKey(role))
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          apply(JSON.parse(raw) as ConfigBundle);
        } catch {
          /* corrupt cache — ignore */
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) refresh();
      });
    return () => {
      cancelled = true;
    };
  }, [role, apply, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(() => ({ configs, version, hydrated, refresh }), [configs, version, hydrated, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useConfigState() {
  const value = useContext(Context);
  if (!value) throw new Error('useConfig must be used within ConfigProvider');
  return value;
}

export function useConfig<K extends keyof AppConfigs>(key: K): AppConfigs[K] {
  return useConfigState().configs[key];
}

export function useFeature(flag: keyof FeatureFlags): boolean {
  return Boolean(useConfig('app.features')[flag]);
}

export function useRules(): BookingRules {
  return useConfig('booking.rules');
}

/** Polling interval in ms for react-query, from `app.polling`. */
export function usePolling(kind: keyof AppConfigs['app.polling']): number {
  return Math.max(3, useConfig('app.polling')[kind]) * 1000;
}
