import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePolling } from '@/config/provider';
import { api } from '@/lib/api';
import type { NotificationInbox } from '@/lib/types';

export const inboxKey = ['notifications'] as const;

/** The signed-in user's inbox. Polled at `app.polling.lists` while the app is foregrounded. */
export function useInbox() {
  const interval = usePolling('lists');
  return useQuery({
    queryKey: inboxKey,
    queryFn: () => api<NotificationInbox>('/notifications?limit=30'),
    refetchInterval: interval,
  });
}

export function useUnreadCount() {
  return useInbox().data?.unread_count ?? 0;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onMutate: (id) => {
      qc.setQueryData<NotificationInbox>(inboxKey, (old) => {
        if (!old) return old;
        const target = old.items.find((n) => n.id === id);
        if (!target || target.read_at) return old;
        return {
          unread_count: Math.max(0, old.unread_count - 1),
          items: old.items.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        };
      });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onMutate: () => {
      const now = new Date().toISOString();
      qc.setQueryData<NotificationInbox>(inboxKey, (old) =>
        old ? { unread_count: 0, items: old.items.map((n) => ({ ...n, read_at: n.read_at ?? now })) } : old,
      );
    },
  });
}
