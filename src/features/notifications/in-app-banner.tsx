import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { impact } from '@/lib/haptics';
import { shadow, useTheme } from '@/theme';

export type InAppAlert = {
  id: string;
  title: string;
  body?: string;
  icon?: IconName;
  onPress?: () => void;
};

type Api = { show: (alert: InAppAlert) => void };
const Context = createContext<Api | null>(null);

/** Heads-up banner for new requests and booking updates while the app is open. */
export function InAppBannerProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<InAppAlert | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors: c, radius } = useTheme();
  const t = useT();

  const show = useCallback((next: InAppAlert) => {
    if (timer.current) clearTimeout(timer.current);
    impact();
    setAlert(next);
    timer.current = setTimeout(() => setAlert(null), 6000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <Context.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[s.host, { top: insets.top + 6 }]}>
        {alert ? (
          <Animated.View key={alert.id} entering={SlideInUp.duration(220)} exiting={FadeOutUp.duration(160)}>
            <Pressable
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              onPress={() => {
                setAlert(null);
                alert.onPress?.();
              }}
              style={[s.card, shadow, { backgroundColor: c.surface, borderRadius: radius.card, borderColor: c.border }]}
            >
              <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
                <Icon name={alert.icon ?? 'bell'} size={20} color={c.primary} />
              </View>
              <View style={s.text}>
                <Text variant="title" numberOfLines={1}>
                  {alert.title}
                </Text>
                {alert.body ? (
                  <Text variant="bodySm" color="muted" numberOfLines={2}>
                    {alert.body}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setAlert(null)} hitSlop={10} accessibilityLabel={t('common.close')} accessibilityRole="button">
                <Icon name="x" size={18} color={c.subtle} />
              </Pressable>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Context.Provider>
  );
}

export function useInAppBanner() {
  const value = useContext(Context);
  if (!value) throw new Error('useInAppBanner must be used within InAppBannerProvider');
  return value;
}

const s = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, zIndex: 999 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
