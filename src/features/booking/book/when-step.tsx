import { ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState, PressableScale, Text } from '@/components/ui';
import { useRules } from '@/config/provider';
import { useNow } from '@/hooks/use-now';
import { useT } from '@/i18n';
import { istDateKey, slotLabel } from '@/lib/format';
import { buildDates, slotsFor } from '@/lib/slots';
import { useTheme } from '@/theme';

const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' });
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });

/** Date strip + time slots, built from `booking.rules` and a live clock (M5). */
export function WhenStep({
  dateKey,
  time,
  onDate,
  onTime,
}: {
  dateKey: string | null;
  time: string | null;
  onDate: (key: string) => void;
  onTime: (time: string) => void;
}) {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const rules = useRules();
  const now = useNow();
  const dates = buildDates(rules, now);
  const todayKey = istDateKey(now);
  const activeKey = dateKey && dates.some((d) => d.key === dateKey) ? dateKey : dates[0]?.key;
  const slots = activeKey ? slotsFor(activeKey, rules, now) : [];
  const groups = [
    { label: t('book.morning'), items: slots.filter((s) => Number(s.slice(0, 2)) < 12) },
    { label: t('book.afternoon'), items: slots.filter((s) => Number(s.slice(0, 2)) >= 12 && Number(s.slice(0, 2)) < 17) },
    { label: t('book.evening'), items: slots.filter((s) => Number(s.slice(0, 2)) >= 17) },
  ].filter((g) => g.items.length > 0);

  if (dates.length === 0) return <EmptyState icon="calendar" title={t('book.noSlots')} />;

  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.dates}>
        {dates.map((d) => {
          const active = d.key === activeKey;
          return (
            <PressableScale
              key={d.key}
              onPress={() => onDate(d.key)}
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${WEEKDAY.format(d.date)} ${DAY.format(d.date)} ${MONTH.format(d.date)}`}
              style={[
                s.date,
                { borderRadius: radius.input, backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border },
              ]}
            >
              <Text variant="caption" color={active ? c.onPrimary : c.subtle}>
                {d.key === todayKey ? t('common.today') : WEEKDAY.format(d.date)}
              </Text>
              <Text variant="h3" color={active ? c.onPrimary : c.ink}>
                {DAY.format(d.date)}
              </Text>
              <Text variant="caption" color={active ? c.onPrimary : c.subtle}>
                {MONTH.format(d.date)}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
      {groups.map((g) => (
        <View key={g.label} style={s.group}>
          <Text variant="label" color="muted">
            {g.label}
          </Text>
          <View style={s.slots}>
            {g.items.map((slot) => {
              const active = activeKey === dateKey && slot === time;
              return (
                <PressableScale
                  key={slot}
                  onPress={() => {
                    if (activeKey && activeKey !== dateKey) onDate(activeKey);
                    onTime(slot);
                  }}
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={slotLabel(slot)}
                  style={[
                    s.slot,
                    { borderRadius: radius.input, backgroundColor: active ? c.primarySoft : c.surface, borderColor: active ? c.primary : c.border },
                  ]}
                >
                  <Text variant="label" color={active ? c.primaryDark : c.inkSoft}>
                    {slotLabel(slot)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },
  bleed: { marginHorizontal: -16 },
  dates: { paddingHorizontal: 16, gap: 8 },
  date: { width: 64, paddingVertical: 10, alignItems: 'center', borderWidth: 1, gap: 2 },
  group: { gap: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31.5%', height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
