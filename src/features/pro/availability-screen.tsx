import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Card, Chip, ErrorState, Header, Screen, Sheet, SkeletonList, Text, useToast } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import { slotLabel } from '@/lib/format';
import { success } from '@/lib/haptics';
import type { AvailabilitySlot } from '@/lib/types';
import { useTheme } from '@/theme';
import { useSaveSlots, useSlots } from './api';

const DAYS: CopyKey[] = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat', 'day.sun'];
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const hhmm = (time: string) => time.slice(0, 5);

type Editing = { index: number; field: 'start_time' | 'end_time' } | null;

/** Weekly working hours — `GET/PUT /professionals/me/availability/slots`. */
export function AvailabilityScreen() {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const slots = useSlots();
  const save = useSaveSlots();
  const [draft, setDraft] = useState<AvailabilitySlot[] | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => {
    if (slots.data && draft === null) setDraft(slots.data.map((s) => ({ ...s, start_time: hhmm(s.start_time), end_time: hhmm(s.end_time) })));
  }, [slots.data, draft]);

  const list = draft ?? [];
  const toggleDay = (day: number, on: boolean) =>
    setDraft(on ? [...list, { day_of_week: day, start_time: '09:00', end_time: '18:00' }] : list.filter((s) => s.day_of_week !== day));
  const setTime = (index: number, field: 'start_time' | 'end_time', value: string) =>
    setDraft(list.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  const invalid = list.some((s) => s.end_time <= s.start_time);

  function submit() {
    save.mutate(
      list.map((s) => ({ day_of_week: s.day_of_week, start_time: `${s.start_time}:00`, end_time: s.end_time === '24:00' ? '23:59:00' : `${s.end_time}:00` })),
      {
        onSuccess: () => {
          success();
          toast.show(t('availability.saved'), 'success');
          router.back();
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    );
  }

  const current = editing ? list[editing.index] : null;
  const options = editing?.field === 'end_time' ? [...TIMES.filter((x) => current && x > current.start_time), '24:00'] : TIMES;

  return (
    <Screen
      header={<Header title={t('pro.availability')} />}
      footer={<Button title={t('common.save')} size="lg" loading={save.isPending} disabled={!draft || invalid} onPress={submit} />}
    >
      <Text variant="bodySm" color="muted">
        {t('availability.body')}
      </Text>
      {slots.isPending ? (
        <SkeletonList count={7} lines={1} />
      ) : slots.isError ? (
        <ErrorState error={slots.error} onRetry={() => slots.refetch()} />
      ) : (
        DAYS.map((label, day) => {
          const windows = list.map((s, index) => ({ s, index })).filter(({ s }) => s.day_of_week === day);
          const on = windows.length > 0;
          return (
            <Card key={label} style={s.day}>
              <View style={s.row}>
                <Text variant="title" style={s.flex}>
                  {t(label)}
                </Text>
                <Text variant="caption" color="subtle">
                  {on ? '' : t('availability.off')}
                </Text>
                <Switch value={on} onValueChange={(v) => toggleDay(day, v)} trackColor={{ true: c.primary, false: c.border }} thumbColor={c.white} accessibilityLabel={t(label)} />
              </View>
              {windows.map(({ s: w, index }) => (
                <View key={index} style={s.row}>
                  <TimeButton label={slotLabel(w.start_time)} onPress={() => setEditing({ index, field: 'start_time' })} />
                  <Text variant="caption" color="subtle">
                    {t('availability.to')}
                  </Text>
                  <TimeButton label={w.end_time === '24:00' ? slotLabel('23:59') : slotLabel(w.end_time)} onPress={() => setEditing({ index, field: 'end_time' })} />
                  <View style={s.flex} />
                  {windows.length > 1 ? (
                    <Pressable onPress={() => setDraft(list.filter((_, i) => i !== index))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                      <Icon name="trash" size={18} color={c.subtle} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {on ? (
                <Text
                  variant="label"
                  color="primary"
                  onPress={() => setDraft([...list, { day_of_week: day, start_time: '18:00', end_time: '21:00' }])}
                  accessibilityRole="button"
                >
                  {t('availability.addWindow')}
                </Text>
              ) : null}
              {windows.some(({ s: w }) => w.end_time <= w.start_time) ? (
                <Text variant="caption" color="danger">
                  {t('availability.invalid')}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.field === 'end_time' ? t('availability.endTime') : t('availability.startTime')}>
        <View style={s.times}>
          {options.map((time) => (
            <Chip
              key={time}
              label={time === '24:00' ? slotLabel('23:59') : slotLabel(time)}
              selected={!!current && current[editing!.field] === time}
              onPress={() => {
                if (editing) setTime(editing.index, editing.field, time);
                setEditing(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function TimeButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: c, radius } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.time, { borderColor: c.border, borderRadius: radius.input }]}>
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  day: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
