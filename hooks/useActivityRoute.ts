import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { routeQueryOptions } from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useActivityRoute(activityId: string | null) {
  const { credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const options = routeQueryOptions(credentials, activityId);
  const { queryKey } = options;

  const query = useQuery(options);
  const refetch = useRefetchQuery(queryKey);

  async function refetchIfFailed() {
    if (queryClient.getQueryState(queryKey)?.status !== 'error') return;

    await refetch();
  }

  return { query, refetch, refetchIfFailed };
}
