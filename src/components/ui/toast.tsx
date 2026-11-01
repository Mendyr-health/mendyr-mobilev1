import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons';
import { shadow, useTheme } from '@/theme';
import { Text } from './text';

type ToastTone = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastApi = { show: (message: string, tone?: ToastTone) => void };

const Context = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors: c, radius } = useTheme();

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const icon: Record<ToastTone, IconName> = { success: 'checkCircle', error: 'alert', info: 'info' };
  const tint: Record<ToastTone, string> = { success: c.success, error: c.danger, info: c.primary };

  return (
    <Context.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[s.host, { top: insets.top + 8 }]}>
        {toast ? (
          <Animated.View key={toast.id} entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(150)}>
            <Pressable
              onPress={() => setToast(null)}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[s.toast, shadow, { backgroundColor: c.ink, borderRadius: radius.input }]}
            >
              <Icon name={icon[toast.tone]} size={18} color={tint[toast.tone] === c.primary ? c.primaryMuted : tint[toast.tone]} />
              <Text variant="label" color={c.white} style={s.message}>
                {toast.message}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Context.Provider>
  );
}

export function useToast() {
  const value = useContext(Context);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}

const s = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 480 },
  message: { flexShrink: 1 },
});
