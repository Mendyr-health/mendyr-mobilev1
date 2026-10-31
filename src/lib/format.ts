export const MARKET_TZ = 'Asia/Kolkata';
export const IST_OFFSET = '+05:30';

export const inr = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: MARKET_TZ,
  }).format(new Date(value));

export const addressLine = (a: {
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
}) => [a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ');

export const statusLabel = (s: string) =>
  ({
    searching: 'Finding a professional',
    assigned: 'Confirmed',
    confirmed: 'Confirmed',
    en_route: 'On the way',
    in_progress: 'Visit in progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Not fulfilled',
  }[s] ?? s.replace(/_/g, ' '));

export const query = (params: Record<string, string | number | null | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(
    ([k, v]) => v !== null && v !== undefined && v !== '' && s.set(k, String(v)),
  );
  return s.toString() ? `?${s}` : '';
};

/** Formats a date into YYYY-MM-DD in India time (IST) */
export function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Combines date ("YYYY-MM-DD") and slot ("HH:MM") into an ISO string with +05:30 offset */
export function istIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00${IST_OFFSET}`;
}

/** Formats "09:30" -> "9:30 am", "14:00" -> "2:00 pm" */
export function slotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'am' : 'pm';
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
