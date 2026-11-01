import { StyleSheet, Switch, View } from 'react-native';
import { Card, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { tick } from '@/lib/haptics';
import type { ProfessionalProfile } from '@/lib/types';
import { useTheme } from '@/theme';
import { useUpdateProfile } from './api';

/** Online/accepting toggle — optimistic, rolls back with a toast if the server refuses. */
export function OnlineToggle({ profile }: { profile: ProfessionalProfile }) {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const update = useUpdateProfile();
  const on = profile.is_accepting_bookings;
  return (
    <Card style={[s.card, { borderColor: on ? c.success : c.border }]}>
      <View style={[s.dot, { backgroundColor: on ? c.success : c.faint }]} />
      <View style={s.flex}>
        <Text variant="title">{on ? t('pro.online') : t('pro.offline')}</Text>
        <Text variant="caption" color="muted">
          {on ? t('pro.onlineBody') : t('pro.offlineBody')}
        </Text>
      </View>
      <Switch
        value={on}
        onValueChange={(next) => {
          tick();
          update.mutate({ is_accepting_bookings: next }, { onError: (e) => toast.show(e.message, 'error') });
        }}
        trackColor={{ true: c.success, false: c.border }}
        thumbColor={c.white}
        accessibilityLabel={t('pro.acceptingLabel')}
      />
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1, gap: 2 },
});
