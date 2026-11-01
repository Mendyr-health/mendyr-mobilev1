import { istDateKey } from '@/lib/format';
import type { ProBooking } from '@/lib/types';

const DAY_MS = 86_400_000;

/** Earnings from completed visits, bucketed by IST day of completion. */
export function earningsSummary(visits: ProBooking[], now = new Date()) {
  const completed = visits.filter((v) => v.status === 'completed');
  const todayKey = istDateKey(now);
  const weekStart = istDateKey(new Date(now.getTime() - 6 * DAY_MS));
  const monthPrefix = todayKey.slice(0, 7);
  let today = 0;
  let week = 0;
  let month = 0;
  for (const v of completed) {
    const key = istDateKey(new Date(v.completed_at ?? v.scheduled_start_at));
    if (key === todayKey) today += v.earning_amount;
    if (key >= weekStart && key <= todayKey) week += v.earning_amount;
    if (key.startsWith(monthPrefix)) month += v.earning_amount;
  }
  const list = [...completed].sort((a, b) => (b.completed_at ?? b.scheduled_start_at).localeCompare(a.completed_at ?? a.scheduled_start_at));
  return { today, week, month, list, count: completed.length };
}
