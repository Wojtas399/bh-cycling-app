import { handleIntervalsAuthError } from './handleIntervalsAuthError';
import { IntervalsAuthError } from './intervalsApi';
import { QueryCache, QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: error => {
        if (error instanceof IntervalsAuthError) {
          // The handler's last step, the Firestore delete, is best-effort.
          handleIntervalsAuthError(client).catch(() => {});
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Data lasts the whole session and only gets fresher through an
        // explicit refresh, unless a query's own options say otherwise (see
        // `intervalsQueries`).
        staleTime: Infinity,
        gcTime: Infinity,
        // Any future retry count must never retry an IntervalsAuthError — the
        // token is known-bad and every retry would 401 again.
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return client;
}

export const queryClient = createQueryClient();
