import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Service, ServiceCategory } from '@/lib/types';

const HOUR = 60 * 60_000;

export function useServices() {
  return useQuery({ queryKey: ['catalog', 'services'], queryFn: () => api<Service[]>('/services'), staleTime: HOUR });
}

export function useCategories() {
  return useQuery({ queryKey: ['catalog', 'categories'], queryFn: () => api<ServiceCategory[]>('/services/categories'), staleTime: HOUR });
}

/** One service — seeded from the cached catalogue so the detail page paints instantly. */
export function useService(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['catalog', 'service', id],
    queryFn: () => api<Service>(`/services/${id}`),
    enabled: !!id,
    staleTime: HOUR,
    initialData: () => qc.getQueryData<Service[]>(['catalog', 'services'])?.find((s) => s.id === id),
    initialDataUpdatedAt: () => qc.getQueryState(['catalog', 'services'])?.dataUpdatedAt,
  });
}
