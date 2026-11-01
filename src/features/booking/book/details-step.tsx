import { StyleSheet, Switch, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, Field, Text } from '@/components/ui';
import { useFeature } from '@/config/provider';
import { useT } from '@/i18n';
import { tick } from '@/lib/haptics';
import { useTheme } from '@/theme';

export function DetailsStep({
  female,
  onFemale,
  notes,
  onNotes,
}: {
  female: boolean;
  onFemale: (v: boolean) => void;
  notes: string;
  onNotes: (v: string) => void;
}) {
  const t = useT();
  const { colors: c } = useTheme();
  const genderPreference = useFeature('gender_preference');
  return (
    <View style={s.wrap}>
      {genderPreference ? (
        <Card style={s.row}>
          <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
            <Icon name="female" size={18} color={c.primary} />
          </View>
          <View style={s.flex}>
            <Text variant="title">{t('book.femaleTitle')}</Text>
            <Text variant="caption" color="muted">
              {t('book.femaleBody')}
            </Text>
          </View>
          <Switch
            value={female}
            onValueChange={(v) => {
              tick();
              onFemale(v);
            }}
            trackColor={{ true: c.primary, false: c.border }}
            thumbColor={c.white}
            accessibilityLabel={t('book.femaleTitle')}
          />
        </Card>
      ) : null}
      <Field
        label={t('book.notes')}
        placeholder={t('book.notesHint')}
        value={notes}
        onChangeText={onNotes}
        multiline
        maxLength={1000}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
