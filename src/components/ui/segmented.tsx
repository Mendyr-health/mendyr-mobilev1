import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors: c, radius } = useTheme();
  return (
    <View style={[s.track, { backgroundColor: c.divider, borderRadius: radius.input }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            scaleTo={0.98}
            style={[s.item, { borderRadius: radius.input - 3 }, active && { backgroundColor: c.surface }]}
          >
            <Text variant="label" color={active ? 'ink' : 'subtle'}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 38 },
});
