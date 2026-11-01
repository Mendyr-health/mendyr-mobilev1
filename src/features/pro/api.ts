import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePolling } from '@/config/provider';
import { api } from '@/lib/api';
import type { AvailabilitySlot, BookingRequest, MyService, ProBooking, ProfessionalProfile } from '@/lib/types';
import { isActive } from '@/features/booking/status';

export const proKeys = {
  all: ['pro'] as const,
  me: ['pro', 'me'] as const,
  requests: ['pro', 'requests'] as const,
  bookings: ['pro', 'bookings'] as const,
  booking: (id: string) => ['pro', 'booking', id] as const,
  slots: ['pro', 'slots'] as const,
  services: ['pro', 'services'] as const,
};

export function useProProfile() {
  return useQuery({ queryKey: proKeys.me, queryFn: () => api<ProfessionalProfile>('/professionals/me') });
}

export type ProfileUpdate = Partial<
  Pick<ProfessionalProfile, 'is_accepting_bookings' | 'service_radius_km' | 'languages_spoken' | 'bio' | 'years_of_experience'>
>;

/** PATCH /professionals/me with an optimistic cache update (the online toggle feels instant). */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => api<ProfessionalProfile>('/professionals/me', { method: 'PATCH', body: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: proKeys.me });
      const previous = qc.getQueryData<ProfessionalProfile>(proKeys.me);
      if (previous) qc.setQueryData(proKeys.me, { ...previous, ...patch });
      return { previous };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(proKeys.me, ctx.previous);
    },
    onSuccess: (profile) => {
      qc.setQueryData(proKeys.me, profile);
      qc.invalidateQueries({ queryKey: proKeys.requests });
    },
  });
}

export function useRequests(enabled: boolean) {
  const interval = usePolling('requests');
  return useQuery({
    queryKey: proKeys.requests,
    queryFn: () => api<BookingRequest[]>('/bookings/professional/requests'),
    enabled,
    refetchInterval: enabled ? interval : false,
  });
}

export function useProBookings() {
  const interval = usePolling('lists');
  return useQuery({
    queryKey: proKeys.bookings,
    queryFn: () => api<ProBooking[]>('/bookings/professional/mine?page_size=100'),
    refetchInterval: interval,
  });
}

export function useProBooking(id: string | undefined) {
  const qc = useQueryClient();
  const interval = usePolling('active_booking');
  return useQuery({
    queryKey: proKeys.booking(id ?? ''),
    queryFn: () => api<ProBooking>(`/bookings/professional/${id}`),
    enabled: !!id,
    initialData: () => qc.getQueryData<ProBooking[]>(proKeys.bookings)?.find((b) => b.id === id),
    initialDataUpdatedAt: () => qc.getQueryState(proKeys.bookings)?.dataUpdatedAt,
    refetchInterval: (q) => (q.state.data && isActive(q.state.data.status) ? interval : false),
  });
}

function useBookingWrite<TInput>(fn: (input: TInput) => Promise<ProBooking>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (booking) => {
      qc.setQueryData(proKeys.booking(booking.id), booking);
      qc.invalidateQueries({ queryKey: proKeys.bookings });
      qc.invalidateQueries({ queryKey: proKeys.requests });
      qc.invalidateQueries({ queryKey: proKeys.me });
    },
  });
}

export const useAccept = () => useBookingWrite((id: string) => api<ProBooking>(`/bookings/${id}/accept`, { method: 'POST' }));
export const useEnRoute = () => useBookingWrite((id: string) => api<ProBooking>(`/bookings/${id}/en-route`, { method: 'POST' }));
export const useCheckIn = () =>
  useBookingWrite(({ id, pin }: { id: string; pin?: string }) =>
    api<ProBooking>(`/bookings/${id}/check-in`, { method: 'POST', body: pin ? { visit_pin: pin } : {} }),
  );
export const useCheckOut = () =>
  useBookingWrite(({ id, notes, vitals }: { id: string; notes: string | null; vitals: string | null }) =>
    api<ProBooking>(`/bookings/${id}/check-out`, { method: 'POST', body: { visit_summary_notes: notes, vitals_recorded: vitals } }),
  );
export const useRelease = () => useBookingWrite((id: string) => api<ProBooking>(`/bookings/${id}/release`, { method: 'POST' }));

export function useSlots() {
  return useQuery({ queryKey: proKeys.slots, queryFn: () => api<AvailabilitySlot[]>('/professionals/me/availability/slots') });
}

export function useSaveSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: AvailabilitySlot[]) => api('/professionals/me/availability/slots', { method: 'PUT', body: slots }),
    onSuccess: (_r, slots) => {
      qc.setQueryData(proKeys.slots, slots);
      qc.invalidateQueries({ queryKey: proKeys.requests });
    },
  });
}

export function useMyServices() {
  return useQuery({ queryKey: proKeys.services, queryFn: () => api<MyService[]>('/professionals/me/services') });
}

export function useToggleService() {
  const qc = useQueryClient();
  return useMutation({
    // Re-send the current price override: omitting it would reset the price to base.
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      api<MyService>(`/professionals/me/services/${id}`, {
        method: 'PUT',
        body: {
          is_opted_in: on,
          price_override: qc.getQueryData<MyService[]>(proKeys.services)?.find((s) => s.service_id === id)?.price_override ?? null,
        },
      }),
    onMutate: ({ id, on }) => {
      const previous = qc.getQueryData<MyService[]>(proKeys.services);
      qc.setQueryData<MyService[]>(proKeys.services, (old) => old?.map((s) => (s.service_id === id ? { ...s, is_opted_in: on } : s)));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(proKeys.services, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: proKeys.requests }),
  });
}
