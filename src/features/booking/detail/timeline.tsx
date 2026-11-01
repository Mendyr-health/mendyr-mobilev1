import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import { timeLabel, dayLabel } from '@/lib/format';
import type { Booking, BookingStatus } from '@/lib/types';
import { useTheme } from '@/theme';

type Step = { key: string; label: CopyKey; at: string | null; state: 'done' | 'current' | 'todo' | 'bad'; note?: string | null };

const FLOW: { status: BookingStatus[]; label: CopyKey }[] = [
  { status: ['created', 'searching'], label: 'timeline.booked' },
  { status: ['assigned', 'confirmed'], label: 'timeline.assigned' },
  { status: ['en_route'], label: 'timeline.enRoute' },
  { status: ['in_progress'], label: 'timeline.started' },
  { status: ['completed'], label: 'timeline.completed' },
];
const TERMINAL_BAD: BookingStatus[] = ['cancelled', 'failed', 'no_show'];

function buildSteps(b: Booking): Step[] {
  const eventAt = (statuses: BookingStatus[]) => b.timeline.find((e) => statuses.includes(e.status))?.at ?? null;
  const currentIndex = FLOW.findIndex((f) => f.status.includes(b.status));
  const bad = TERMINAL_BAD.includes(b.status);
  const steps: Step[] = [];
  FLOW.forEach((f, i) => {
    let at = eventAt(f.status);
    if (i === 0) at = at ?? b.created_at;
    if (f.status.includes('en_route')) at = at ?? b.en_route_at;
    if (f.status.includes('in_progress')) at = at ?? b.started_at;
    if (f.status.includes('completed')) at = at ?? b.completed_at;
    if (bad) {
      if (at) steps.push({ key: f.label, label: f.label, at, state: 'done' });
      return;
    }
    const state = i < currentIndex ? 'done' : i === currentIndex ? (b.status === 'completed' ? 'done' : 'current') : 'todo';
    // en_route is optional — skip it once the visit has started without it.
    if (f.status.includes('en_route') && !at && currentIndex > i) return;
    steps.push({ key: f.label, label: f.label, at, state });
  });
  if (bad) {
    const ev = b.timeline.find((e) => e.status === b.status);
    steps.push({ key: b.status, label: `status.${b.status}` as CopyKey, at: ev?.at ?? null, state: 'bad', note: ev?.note ?? b.cancellation_reason });
  }
  return steps;
}

/** Zomato-style vertical status timeline built from `booking.timeline`. */
export function Timeline({ booking }: { booking: Booking }) {
  const t = useT();
  const { colors: c } = useTheme();
  const steps = buildSteps(booking);
  return (
    <View accessibilityRole="list">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const color =
          step.state === 'bad' ? c.danger : step.state === 'done' ? c.success : step.state === 'current' ? c.primary : c.border;
        return (
          <View key={step.key} style={s.row} accessible accessibilityLabel={`${t(step.label)}${step.at ? `, ${timeLabel(step.at)}` : ''}`}>
            <View style={s.rail}>
              <View style={[s.dot, { borderColor: color, backgroundColor: step.state === 'todo' ? c.surface : color }]}>
                {step.state === 'done' ? <Icon name="check" size={12} color={c.white} strokeWidth={3} /> : null}
                {step.state === 'bad' ? <Icon name="x" size={12} color={c.white} strokeWidth={3} /> : null}
                {step.state === 'current' ? <View style={[s.pulse, { backgroundColor: c.white }]} /> : null}
              </View>
              {!last ? <View style={[s.line, { backgroundColor: step.state === 'done' ? c.success : c.border }]} /> : null}
            </View>
            <View style={[s.body, last && s.lastBody]}>
              <Text variant="title" color={step.state === 'todo' ? 'faint' : step.state === 'bad' ? 'danger' : 'ink'}>
                {t(step.label)}
              </Text>
              {step.at ? (
                <Text variant="caption" color="subtle">
                  {dayLabel(step.at)} · {timeLabel(step.at)}
                </Text>
              ) : null}
              {step.note ? (
                <Text variant="caption" color="muted">
                  {step.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pulse: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, minHeight: 22, marginVertical: 2 },
  body: { flex: 1, paddingBottom: 18, gap: 2 },
  lastBody: { paddingBottom: 0 },
});
