import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  tone = 'default',
  right,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  right?: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const fg = tone === 'danger' ? c.danger : c.ink;
  const content = (
    <>
      {icon ? (
        <View style={[s.icon, { backgroundColor: tone === 'danger' ? c.dangerSoft : c.primarySoft }]}>
          <Icon name={icon} size={18} color={tone === 'danger' ? c.danger : c.primary} />
        </View>
      ) : null}
      <View style={s.text}>
        <Text variant="title" color={fg} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="subtle" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySm" color="muted">
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevronRight" size={18} color={c.faint} /> : null}
    </>
  );
  if (!onPress) return <View style={s.row}>{content}</View>;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} style={s.row} accessibilityLabel={title}>
      {content}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
