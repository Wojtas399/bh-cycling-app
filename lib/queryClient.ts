import { reportError } from './errorReporting';
import { handleIntervalsAuthError } from './handleIntervalsAuthError';
import { ignoreFailure } from './ignoreFailure';
import { IntervalsAuthError } from './intervalsApi';
import { isExpectedError } from './isExpectedError';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

const KEPT_FOR_THE_SESSION_UNTIL_REFRESHED = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

function reportIfUnexpected(error: unknown): void {
  if (!isExpectedError(error)) reportError(error);
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: error => {
        if (error instanceof IntervalsAuthError) {
          ignoreFailure(() => handleIntervalsAuthError(client));
        }

        reportIfUnexpected(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: reportIfUnexpected,
    }),
    defaultOptions: {
      queries: {
        ...KEPT_FOR_THE_SESSION_UNTIL_REFRESHED,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return client;
}

export const queryClient = createQueryClient();
