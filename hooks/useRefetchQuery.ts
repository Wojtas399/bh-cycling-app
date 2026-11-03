import { type QueryKey, useQueryClient } from '@tanstack/react-query';

/**
 * Refetches the one query under exactly `queryKey`, for pull-to-refresh. Goes
 * through the client rather than `query.refetch`: reading a property off the
 * tracked query result would narrow which changes re-render.
 */
export function useRefetchQuery(queryKey: QueryKey): () => Promise<void> {
  const queryClient = useQueryClient();

  return () => queryClient.refetchQueries({ queryKey, exact: true });
}
