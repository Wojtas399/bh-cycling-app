import type { ReactNode } from 'react';

import { createQueryClient } from '@/lib/queryClient';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

/**
 * RNTL's `renderHook` inside a `QueryClientProvider`. Each call gets a fresh
 * app-configured client unless one is passed; it's returned so tests can seed
 * or inspect the cache.
 */
export async function renderHookWithClient<Result>(
  callback: () => Result,
  { client = createQueryClient() }: { client?: QueryClient } = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { ...(await renderHook(callback, { wrapper })), client };
}
