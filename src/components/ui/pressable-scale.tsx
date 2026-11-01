import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tick } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (0.97 by default). */
  scaleTo?: number;
  haptic?: boolean;
  /** Fade to 50% when disabled (off for loading buttons, which show a spinner instead). */
  dimWhenDisabled?: boolean;
};

/** Tappable surface with the standard press feedback: scale 0.97 + a light haptic tick. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  haptic = true,
  dimWhenDisabled = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 120 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 180 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tick();
        onPress?.(e);
      }}
      style={[style, animated, disabled && dimWhenDisabled ? { opacity: 0.5 } : null]}
    />
  );
}
