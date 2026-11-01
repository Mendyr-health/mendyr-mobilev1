import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: boolean;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  full = true,
  style,
  accessibilityLabel,
}: Props) {
  const { colors: c, radius } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.primarySoft, fg: c.primaryDark, border: c.primarySoft },
    outline: { bg: c.surface, fg: c.ink, border: c.border },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
    success: { bg: c.success, fg: c.onPrimary, border: c.success },
  };
  const p = palette[variant];
  const height = size === 'lg' ? 54 : size === 'sm' ? 38 : 48;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      dimWhenDisabled={!loading}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        s.base,
        {
          height,
          backgroundColor: p.bg,
          borderColor: p.border,
          borderRadius: radius.input,
          paddingHorizontal: size === 'sm' ? 14 : 18,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <View style={[s.row, iconRight && s.reverse]}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={p.fg} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'title'} color={p.fg} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reverse: { flexDirection: 'row-reverse' },
});
