import { router, type Href } from 'expo-router';
import type { AppNotification, Role } from '@/lib/types';

/** Where tapping a notification goes: its booking, if it carries one. */
export function notificationHref(n: Pick<AppNotification, 'data'>, role: Role | undefined): Href | null {
  const bookingId = typeof n.data?.booking_id === 'string' ? n.data.booking_id : null;
  if (!bookingId) return null;
  return (role === 'professional' ? `/visit/${bookingId}` : `/booking/${bookingId}`) as Href;
}

export function openNotification(n: Pick<AppNotification, 'data'>, role: Role | undefined) {
  const href = notificationHref(n, role);
  if (href) router.push(href);
}
