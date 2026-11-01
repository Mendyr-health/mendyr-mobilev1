import type { BookingRules } from '@/config/types';
import { istDateKey, istIso } from './format';

const DAY_MS = 86_400_000;

export type DateOption = { key: string; date: Date };

/** The bookable days: today (IST) up to `horizon_days`, skipping days with no slot left. */
export function buildDates(rules: BookingRules, now: Date): DateOption[] {
  const out: DateOption[] = [];
  for (let i = 0; i < rules.horizon_days; i += 1) {
    const date = new Date(now.getTime() + i * DAY_MS);
    const key = istDateKey(date);
    if (slotsFor(key, rules, now).length > 0) out.push({ key, date });
  }
  return out;
}

/** "HH:MM" slots for an IST day, honouring the start/end hours, step and minimum lead time. */
export function slotsFor(dateKey: string, rules: BookingRules, now: Date): string[] {
  const earliest = now.getTime() + rules.min_lead_minutes * 60_000;
  const latest = now.getTime() + rules.horizon_days * DAY_MS;
  const out: string[] = [];
  for (let m = rules.slot_start_hour * 60; m < rules.slot_end_hour * 60; m += rules.slot_step_minutes) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const at = new Date(istIso(dateKey, time)).getTime();
    if (at >= earliest && at <= latest) out.push(time);
  }
  return out;
}
