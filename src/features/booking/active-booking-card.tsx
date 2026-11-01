import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { PressableScale, Text, useTone } from '@/components/ui';
import { useT } from '@/i18n';
import { firstName, when } from '@/lib/format';
import { useTheme } from '@/theme';
import { useBookings } from './api';
import { isActive, statusHeadlineKey, statusIcon, statusTone } from './status';

/** Live-status strip on Home for the soonest active booking. */
export function ActiveBookingCard() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const bookings = useBookings();
  const live = (bookings.data ?? [])
    .filter((b) => isActive(b.status))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at))[0];
  const tone = useTone(live ? statusTone(live.status) : 'neutral');
  if (!live) return null;
  return (
    <PressableScale
      onPress={() => router.push(`/booking/${live.id}`)}
      accessibilityLabel={t(statusHeadlineKey(live.status), { name: firstName(live.professional_name) })}
      style={[s.card, { backgroundColor: c.surface, borderColor: tone.fg, borderRadius: radius.card }]}
    >
      <View style={[s.icon, { backgroundColor: tone.bg }]}>
        <Icon name={statusIcon(live.status)} size={20} color={tone.fg} />
      </View>
      <View style={s.flex}>
        <Text variant="title" numberOfLines={1}>
          {t(statusHeadlineKey(live.status), { name: firstName(live.professional_name) || t('booking.yourProfessional') })}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {live.service_name_snapshot} · {when(live.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={c.subtle} />
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
