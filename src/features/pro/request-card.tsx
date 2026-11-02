import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { inr, when } from '@/lib/format';
import type { BookingRequest } from '@/lib/types';
import { useTheme } from '@/theme';

export function RequestCard({ request: r, onAccept, busy }: { request: BookingRequest; onAccept: () => void; busy: boolean }) {
  const t = useT();
  const { colors: c } = useTheme();
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text variant="title" numberOfLines={2}>
            {r.service_name}
          </Text>
          <Text variant="caption" color="subtle">
            {r.booking_code}
          </Text>
        </View>
        <View style={s.earning}>
          <Text variant="h3" color="success">
            {inr(r.earning_amount)}
          </Text>
          <Text variant="caption" color="subtle">
            {t('requests.youEarn')}
          </Text>
        </View>
      </View>
      <View style={s.line}>
        <Icon name="calendar" size={14} color={c.subtle} />
        <Text variant="bodySm" color="inkSoft">
          {when(r.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })}
        </Text>
      </View>
      <View style={s.line}>
        <Icon name="pin" size={14} color={c.subtle} />
        <Text variant="bodySm" color="inkSoft" style={s.flex} numberOfLines={1}>
          {r.area}
        </Text>
        <Text variant="caption" color="muted">
          {t('requests.distance', { km: r.distance_km.toFixed(1) })}
        </Text>
      </View>
      {r.preferred_gender === 'female' || r.has_documents ? (
        <View style={s.tags}>
          {r.preferred_gender === 'female' ? <Badge label={t('requests.femalePreferred')} tone="accent" icon="female" /> : null}
          {r.has_documents ? <Badge label={t('requests.hasDocuments')} tone="primary" icon="paperclip" /> : null}
        </View>
      ) : null}
      {r.patient_notes ? (
        <Text variant="caption" color="muted" numberOfLines={2}>
          “{r.patient_notes}”
        </Text>
      ) : null}
      <Button title={t('requests.accept')} icon="check" onPress={onAccept} loading={busy} />
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  earning: { alignItems: 'flex-end' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
