import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { PressableScale, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** One document in a list: tap to view; optional trailing control (delete, checkbox…). */
export function DocumentRow({
  icon,
  title,
  subtitle,
  onPress,
  opening,
  onDelete,
  right,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  opening?: boolean;
  onDelete?: () => void;
  right?: React.ReactNode;
}) {
  const t = useT();
  const { colors: c } = useTheme();
  return (
    <View style={s.row}>
      <PressableScale onPress={onPress} disabled={!onPress} scaleTo={0.99} style={s.main} accessibilityRole="button" accessibilityLabel={title}>
        <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
          {opening ? <ActivityIndicator size="small" color={c.primary} /> : <Icon name={icon} size={18} color={c.primary} />}
        </View>
        <View style={s.text}>
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="subtle" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </PressableScale>
      {right}
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('docs.delete')} style={s.action}>
          <Icon name="trash" size={18} color={c.subtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  action: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
