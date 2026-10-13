import type { ReactNode } from 'react';

import { createQueryClient } from '@/lib/queryClient';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

/**
 * The app-configured client, minus mutation garbage collection: its 5-minute
 * timers would otherwise keep Jest from exiting.
 */
function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();

  client.setDefaultOptions({
    ...defaults,
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });

  return client;
}

/**
 * RNTL's `renderHook` inside a `QueryClientProvider`. Each call gets a fresh
 * test client unless one is passed; it's returned so tests can seed or inspect
 * the cache.
 */
export async function renderHookWithClient<Result>(
  callback: () => Result,
  { client = createTestQueryClient() }: { client?: QueryClient } = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { ...(await renderHook(callback, { wrapper })), client };
}
