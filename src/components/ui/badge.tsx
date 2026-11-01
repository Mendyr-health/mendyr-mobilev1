import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/theme';
import { Text } from './text';

export type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export function useTone(tone: Tone) {
  const { colors: c } = useTheme();
  return {
    primary: { bg: c.primarySoft, fg: c.primaryDark },
    accent: { bg: c.accentSoft, fg: c.accent },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warningInk },
    danger: { bg: c.dangerSoft, fg: c.danger },
    neutral: { bg: c.divider, fg: c.muted },
  }[tone];
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useTone(tone);
  return (
    <View style={[s.badge, { backgroundColor: p.bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={p.fg} strokeWidth={2.4} /> : null}
      <Text variant="overline" color={p.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
