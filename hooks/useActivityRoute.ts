import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { routeQueryOptions } from '@/lib/intervalsQueries';

export function useActivityRoute(activityId: string | null) {
  const { query, refetch } = useIntervalsRead({
    queryOptions: routeQueryOptions,
    args: [activityId],
  });

  return { query, refetch };
}
