import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePolling } from '@/config/provider';
import { api } from '@/lib/api';
import type { Booking, BookingListItem, Quote } from '@/lib/types';
import { isActive } from './status';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: ['bookings', 'list'] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
};

export function useBookings() {
  const lists = usePolling('lists');
  return useQuery({
    queryKey: bookingKeys.list,
    queryFn: () => api<BookingListItem[]>('/bookings?page_size=100'),
    refetchInterval: (q) => (q.state.data?.some((b) => isActive(b.status)) ? lists : false),
  });
}

/** A booking's detail; polled at `app.polling.active_booking` while it's live. */
export function useBooking(id: string | undefined) {
  const active = usePolling('active_booking');
  return useQuery({
    queryKey: bookingKeys.detail(id ?? ''),
    queryFn: () => api<Booking>(`/bookings/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && isActive(q.state.data.status) ? active : false),
  });
}

export function useQuote(serviceId: string | undefined, addressId: string | undefined) {
  return useQuery({
    queryKey: ['quote', serviceId, addressId ?? null],
    queryFn: () => api<Quote>('/bookings/quote', { method: 'POST', body: { service_id: serviceId, address_id: addressId ?? null } }),
    enabled: !!serviceId,
    staleTime: 5 * 60_000,
  });
}

export type CreateBookingInput = {
  service_id: string;
  address_id: string;
  scheduled_start_at: string;
  patient_notes: string | null;
  preferred_gender?: 'female' | null;
  /** The patient's own medical documents to share with the professional. */
  document_ids?: string[];
};

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookingInput) => api<Booking>('/bookings', { method: 'POST', body }),
    onSuccess: (booking) => {
      qc.setQueryData(bookingKeys.detail(booking.id), booking);
      qc.invalidateQueries({ queryKey: bookingKeys.list });
    },
  });
}

export function useCancelBooking(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api<Booking>(`/bookings/${id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: (booking) => {
      qc.setQueryData(bookingKeys.detail(id), booking);
      qc.invalidateQueries({ queryKey: bookingKeys.list });
    },
  });
}

export function useSubmitReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; tags: string[]; comment: string | null }) =>
      api('/reviews', { method: 'POST', body: { booking_id: id, ...input } }),
    onSuccess: (_, input) => {
      qc.setQueryData<Booking>(bookingKeys.detail(id), (old) => (old ? { ...old, review_rating: input.rating } : old));
    },
  });
}
