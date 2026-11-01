import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConfig, useFeature } from '@/config/provider';
import { en, type CopyKey } from './en';
import { hi } from './hi';

export type Lang = 'en' | 'hi';
export type { CopyKey };
type Vars = Record<string, string | number>;

const TABLES: Record<Lang, Partial<Record<CopyKey, string>>> = { en, hi };
const LANG_KEY = 'mendyr.lang';

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey, vars?: Vars) => string;
  /** Hindi can be switched off from the portal (`app.features.hindi`). */
  canSwitch: boolean;
};

const Context = createContext<I18n | null>(null);

function interpolate(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Lang>('en');
  const hindiEnabled = useFeature('hindi');
  const overrides = useConfig('app.copy').locales;
  const lang: Lang = hindiEnabled ? stored : 'en';

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((value) => {
        if (value === 'hi' || value === 'en') setStored(value);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setStored(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: CopyKey, vars?: Vars) => {
      const text =
        overrides?.[lang]?.[key] ?? TABLES[lang][key] ?? overrides?.en?.[key] ?? en[key] ?? key;
      return interpolate(text, vars);
    },
    [lang, overrides],
  );

  const value = useMemo(() => ({ lang, setLang, t, canSwitch: hindiEnabled }), [lang, setLang, t, hindiEnabled]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}

export function useT() {
  return useI18n().t;
}
