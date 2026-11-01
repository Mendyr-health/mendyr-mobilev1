import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { ApiError } from '@/lib/api';

// React Query pauses `refetchInterval` polling while the app isn't focused; on native that
// has to be wired to AppState so polling stops in the background.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => sub.remove();
  });
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 10 * 60_000,
        retry: (count, error) =>
          count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  });
}
