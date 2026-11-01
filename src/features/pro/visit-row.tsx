import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { statusLabelKey, statusTone } from '@/features/booking/status';
import { useT } from '@/i18n';
import { inr, when } from '@/lib/format';
import type { ProBooking } from '@/lib/types';
import { useTheme } from '@/theme';

export function VisitRow({ visit }: { visit: ProBooking }) {
  const t = useT();
  const { colors: c } = useTheme();
  const who = visit.contact_hidden ? t('privacy.patientRef', { ref: visit.patient_ref }) : visit.patient_name;
  return (
    <Card onPress={() => router.push(`/visit/${visit.id}`)} style={s.card} accessibilityLabel={`${visit.service_name}, ${who}`}>
      <View style={s.head}>
        <Text variant="title" numberOfLines={1} style={s.flex}>
          {visit.service_name}
        </Text>
        <Badge label={t(statusLabelKey(visit.status))} tone={statusTone(visit.status)} />
      </View>
      <View style={s.line}>
        <Icon name="calendar" size={14} color={c.subtle} />
        <Text variant="bodySm" color="muted">
          {when(visit.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })}
        </Text>
      </View>
      <View style={s.line}>
        <Icon name="user" size={14} color={c.subtle} />
        <Text variant="bodySm" color="muted" style={s.flex} numberOfLines={1}>
          {who} · {visit.address}
        </Text>
        <Text variant="label" color="success">
          {inr(visit.earning_amount)}
        </Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 8 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
