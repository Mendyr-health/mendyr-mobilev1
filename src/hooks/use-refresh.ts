import { useCallback } from 'react';

type Refetchable = { refetch: () => Promise<unknown> };

/** Combine several queries into one pull-to-refresh handler. */
export function useRefresh(...queries: Refetchable[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(() => Promise.all(queries.map((q) => q.refetch())), queries);
}
