import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { query } from '@/lib/format';
import type { Address, GeoAddress, GeoLocation } from '@/lib/types';

export const addressKey = ['addresses'] as const;

export function useAddresses() {
  return useQuery({ queryKey: addressKey, queryFn: () => api<Address[]>('/addresses'), staleTime: 5 * 60_000 });
}

export function defaultAddress(list: Address[] | undefined) {
  return list?.find((a) => a.is_default) ?? list?.[0];
}

export type AddressInput = {
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  location?: { latitude: number; longitude: number };
  is_default: boolean;
  contact_name: string | null;
  contact_phone: string | null;
  instructions_for_professional: string | null;
};

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AddressInput }) =>
      id
        ? api<Address>(`/addresses/${id}`, { method: 'PATCH', body })
        : api<Address>('/addresses', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: addressKey }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: addressKey }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Address>(`/addresses/${id}`, { method: 'PATCH', body: { is_default: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: addressKey }),
  });
}

/** Coordinates for a typed address (M3), from its pincode, falling back to the city. */
export const geocodePincode = (pincode: string, city?: string, state?: string) =>
  api<GeoLocation>(`/geo/locate${query({ pincode, city: city || null, state: state || null })}`);

/** Area/city/state/pincode for a device position, to prefill the form. */
export const reverseGeocode = (latitude: number, longitude: number) =>
  api<GeoAddress>(`/geo/reverse${query({ latitude, longitude })}`);
