import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useInAppBanner } from '@/features/notifications/in-app-banner';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import { useProProfile, useRequests } from './api';

/** Heads-up banner when a new visit request appears (polled at `app.polling.requests`;
 * React Query pauses polling while the app is in the background). */
export function RequestWatcher() {
  const t = useT();
  const banner = useInAppBanner();
  const profile = useProProfile();
  const ready = profile.data?.verification_status === 'approved' && !!profile.data.is_accepting_bookings;
  const requests = useRequests(ready);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const items = requests.data;
    if (!items) return;
    if (!seen.current) {
      seen.current = new Set(items.map((r) => r.id));
      return;
    }
    const fresh = items.filter((r) => !seen.current!.has(r.id));
    items.forEach((r) => seen.current!.add(r.id));
    if (fresh.length === 0) return;
    const r = fresh[0];
    banner.show({
      id: `request-${r.id}`,
      title: fresh.length > 1 ? t('requests.newMany', { count: fresh.length }) : t('requests.newOne'),
      body: `${r.service_name} · ${r.area} · ${inr(r.earning_amount)}`,
      icon: 'clipboard',
      onPress: () => router.navigate('/requests'),
    });
  }, [requests.data, banner, t]);

  return null;
}
