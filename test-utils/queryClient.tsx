import type { ReactNode } from 'react';

import { createQueryClient } from '@/lib/queryClient';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();

  client.setDefaultOptions({
    ...defaults,
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });

  return client;
}

export async function renderHookWithClient<Result>(
  callback: () => Result,
  { client = createTestQueryClient() }: { client?: QueryClient } = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { ...(await renderHook(callback, { wrapper })), client };
}
