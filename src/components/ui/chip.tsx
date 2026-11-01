import { StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      style={[
        s.chip,
        {
          backgroundColor: selected ? c.primary : c.surface,
          borderColor: selected ? c.primary : c.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? c.onPrimary : c.muted} /> : null}
      <Text variant="label" color={selected ? c.onPrimary : c.inkSoft} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
  },
});
