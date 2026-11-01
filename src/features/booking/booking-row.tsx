import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { inr, when } from '@/lib/format';
import type { BookingListItem } from '@/lib/types';
import { useTheme } from '@/theme';
import { statusLabelKey, statusTone } from './status';

export function BookingRow({ booking }: { booking: BookingListItem }) {
  const t = useT();
  const { colors: c } = useTheme();
  return (
    <Card onPress={() => router.push(`/booking/${booking.id}`)} style={s.card} accessibilityLabel={`${booking.service_name_snapshot}, ${t(statusLabelKey(booking.status))}`}>
      <View style={s.head}>
        <Text variant="title" numberOfLines={1} style={s.flex}>
          {booking.service_name_snapshot}
        </Text>
        <Badge label={t(statusLabelKey(booking.status))} tone={statusTone(booking.status)} />
      </View>
      <View style={s.line}>
        <Icon name="calendar" size={14} color={c.subtle} />
        <Text variant="bodySm" color="muted">
          {when(booking.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })}
        </Text>
      </View>
      <View style={s.line}>
        <Icon name="user" size={14} color={c.subtle} />
        <Text variant="bodySm" color="muted" style={s.flex} numberOfLines={1}>
          {booking.professional_name ?? t('booking.notAssigned')}
        </Text>
        <Text variant="label">{inr(booking.total_amount)}</Text>
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
