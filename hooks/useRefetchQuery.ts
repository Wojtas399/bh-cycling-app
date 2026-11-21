import { useMemo } from 'react';

import { type QueryKey, hashKey, useQueryClient } from '@tanstack/react-query';

export function useRefetchQuery(queryKey: QueryKey): () => Promise<void> {
  const queryClient = useQueryClient();
  const queryHash = hashKey(queryKey);

  return useMemo(
    () => () => queryClient.refetchQueries({ queryKey, exact: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers build an equal key on every render, so the key's hash stands in for it
    [queryClient, queryHash],
  );
}
