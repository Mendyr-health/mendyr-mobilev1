export const MARKET_TZ = 'Asia/Kolkata';
export const IST_OFFSET = '+05:30';
const DAY_MS = 86_400_000;

/** ₹1,180 / ₹1,18,000 — no decimals unless the amount has paise. */
export function inr(amount: number): string {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(amount);
}

/** Formats a date into YYYY-MM-DD in India time (IST). */
export function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Combines a date key ("YYYY-MM-DD") and "HH:MM" into an ISO string with the IST offset. */
export function istIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00${IST_OFFSET}`;
}

/** "10:30 AM" in IST. */
export function timeLabel(value: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: MARKET_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .toUpperCase();
}

/** "Tue, 4 Nov" in IST. */
export function dayLabel(value: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: MARKET_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

/** "Today" / "Tomorrow" / "Tue, 4 Nov" relative to `now`. */
export function relativeDay(value: string | Date, now = new Date(), words = { today: 'Today', tomorrow: 'Tomorrow' }) {
  const key = istDateKey(new Date(value));
  if (key === istDateKey(now)) return words.today;
  if (key === istDateKey(new Date(now.getTime() + DAY_MS))) return words.tomorrow;
  return dayLabel(value);
}

/** "Today · 10:30 AM", "Tue, 4 Nov · 10:30 AM". */
export function when(value: string | Date, words?: { today: string; tomorrow: string }) {
  return `${relativeDay(value, new Date(), words)} · ${timeLabel(value)}`;
}

/** Short relative time for notifications: "now", "5m", "3h", or a day label. */
export function ago(value: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return dayLabel(value);
}

/** "9:30 AM" from "09:30" (wall-clock, no timezone). */
export function slotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const addressLine = (a: {
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
}) => [a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ');

export const query = (params: Record<string, string | number | null | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(
    ([k, v]) => v !== null && v !== undefined && v !== '' && s.set(k, String(v)),
  );
  return s.toString() ? `?${s}` : '';
};

/** 10-digit Indian mobile -> "+91XXXXXXXXXX"; anything with a + is kept as typed. */
export function toE164India(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+91${digits.slice(-10)}`;
}

export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return /^[6-9]\d{9}$/.test(digits.slice(2));
  return /^[6-9]\d{9}$/.test(digits);
}

export function displayPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'M';
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
