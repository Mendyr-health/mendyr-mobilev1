import { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

/** Shimmer-free pulse block (cheap on low-end Android). */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: c.border }, animated, style]}
    />
  );
}

/** A card-shaped skeleton used for list rows while the first load is in flight. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.card,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 16,
        gap: 10,
      }}
    >
      <Skeleton width="55%" height={18} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '35%' : '85%'} height={12} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </View>
  );
}
