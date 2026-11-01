import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { Text } from './text';

/** Bottom sheet built on Modal: fades the scrim, slides the panel up. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[s.scrim, { backgroundColor: t.colors.scrim }]} onPress={onClose} accessibilityLabel={tr('common.close')} />
        <Animated.View
          entering={SlideInDown.duration(240)}
          style={[
            s.panel,
            {
              backgroundColor: t.colors.surface,
              borderTopLeftRadius: t.radius.lg,
              borderTopRightRadius: t.radius.lg,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={[s.grabber, { backgroundColor: t.colors.border }]} />
          <View style={s.header}>
            <View style={s.flex}>
              <Text variant="h3">{title}</Text>
              {subtitle ? (
                <Text variant="bodySm" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr('common.close')}>
              <Icon name="x" size={22} color={t.colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body} bounces={false}>
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
