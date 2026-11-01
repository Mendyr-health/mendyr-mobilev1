import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { shadow, useTheme } from '@/theme';
import { PressableScale } from './pressable-scale';

type Props = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ onPress, padded = true, flat, style, children, accessibilityLabel, ...rest }: Props) {
  const { colors: c, radius } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.border,
    padding: padded ? 16 : 0,
    ...(flat ? null : shadow),
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, style]} accessibilityLabel={accessibilityLabel}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}
