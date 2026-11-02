import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingKeys } from '@/features/booking/api';
import { proKeys } from '@/features/pro/api';
import { api } from '@/lib/api';
import type { MedicalDocument, MedicalDocumentType, ProDocument, ProDocumentType } from '@/lib/types';

export const docKeys = {
  all: ['documents'] as const,
  pro: ['documents', 'pro'] as const,
  medical: ['documents', 'medical'] as const,
};

// `view_url`s expire in ~5 minutes, so these lists are always refetched when shown and are
// dropped from the cache soon after nobody is looking at them.
const FRESH = { staleTime: 0, gcTime: 2 * 60_000, refetchOnMount: 'always' } as const;

// ---- Professional KYC ----------------------------------------------------------------------

export function useProDocuments(enabled = true) {
  return useQuery({
    queryKey: docKeys.pro,
    queryFn: () => api<ProDocument[]>('/professionals/me/documents'),
    enabled,
    ...FRESH,
  });
}

export function recordProDocument(input: { document_type: ProDocumentType; file_key: string }) {
  return api<ProDocument>('/professionals/me/documents', { method: 'POST', body: input });
}

export function useDeleteProDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/professionals/me/documents/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, id) => {
      qc.setQueryData<ProDocument[]>(docKeys.pro, (old) => old?.filter((d) => d.id !== id));
      qc.invalidateQueries({ queryKey: docKeys.pro });
      qc.invalidateQueries({ queryKey: proKeys.me });
    },
  });
}

// ---- Patient medical documents ------------------------------------------------------------

export function useMedicalDocuments(enabled = true) {
  return useQuery({
    queryKey: docKeys.medical,
    queryFn: () => api<MedicalDocument[]>('/medical-documents'),
    enabled,
    ...FRESH,
  });
}

export type MedicalDocumentInput = {
  document_type: MedicalDocumentType;
  title?: string | null;
  booking_id?: string | null;
};

export function recordMedicalDocument(input: MedicalDocumentInput & { file_key: string }) {
  return api<MedicalDocument>('/medical-documents', { method: 'POST', body: input });
}

export function useDeleteMedicalDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: MedicalDocument) => api(`/medical-documents/${doc.id}`, { method: 'DELETE' }),
    onSuccess: (_r, doc) => {
      qc.setQueryData<MedicalDocument[]>(docKeys.medical, (old) => old?.filter((d) => d.id !== doc.id));
      qc.invalidateQueries({ queryKey: docKeys.medical });
      if (doc.booking_id) qc.invalidateQueries({ queryKey: bookingKeys.detail(doc.booking_id) });
    },
  });
}

/** Attach one of your documents to an upcoming booking (or detach with null). */
export function useAttachDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookingId }: { id: string; bookingId: string | null }) =>
      api<MedicalDocument>(`/medical-documents/${id}`, { method: 'PATCH', body: { booking_id: bookingId } }),
    onSuccess: (doc) => {
      qc.setQueryData<MedicalDocument[]>(docKeys.medical, (old) => old?.map((d) => (d.id === doc.id ? doc : d)));
      qc.invalidateQueries({ queryKey: docKeys.medical });
      // The document may have moved from another booking, so refresh every open booking.
      qc.invalidateQueries({ queryKey: [...bookingKeys.all, 'detail'] });
    },
  });
}
