import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/auth';
import { useInbox } from './api';
import { useInAppBanner } from './in-app-banner';
import { notificationHref, openNotification } from './link';

/** Turns newly arrived inbox items into an in-app banner, and refreshes booking data the
 * notification is about. Items present at first load are treated as already seen. */
export function NotificationWatcher() {
  const { user } = useAuth();
  const inbox = useInbox();
  const banner = useInAppBanner();
  const qc = useQueryClient();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const items = inbox.data?.items;
    if (!items) return;
    if (!seen.current) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    const fresh = items.filter((n) => !seen.current!.has(n.id) && !n.read_at);
    items.forEach((n) => seen.current!.add(n.id));
    if (fresh.length === 0) return;
    // Something changed server-side — refresh lists so screens are current when opened.
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['pro'] });
    const latest = fresh[0];
    banner.show({
      id: latest.id,
      title: latest.title ?? latest.body,
      body: latest.title ? latest.body : undefined,
      icon: 'bell',
      onPress: notificationHref(latest, user?.role) ? () => openNotification(latest, user?.role) : undefined,
    });
  }, [inbox.data, banner, qc, user?.role]);

  return null;
}
