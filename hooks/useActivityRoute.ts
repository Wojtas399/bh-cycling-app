import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { routeQueryOptions } from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The Route of an Activity, by its intervals.icu id
 * (`RouteSummary.activityId`). Skipped for a `null` id. `data` is `null` when
 * the Activity turns out to have no Route. `refetch` refetches this query
 * alone; `refetchIfFailed` does too, but only when it's in error, and
 * otherwise resolves immediately, so pull-to-refresh never downloads a loaded
 * Route again.
 */
export function useActivityRoute(activityId: string | null) {
  const { credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const options = routeQueryOptions(credentials, activityId);
  const { queryKey } = options;

  const query = useQuery(options);

  // Goes through the client rather than `query.refetch`, as in
  // `useWorkoutDetails`, so the tracked query result isn't widened.
  function refetch() {
    return queryClient.refetchQueries({ queryKey, exact: true });
  }

  async function refetchIfFailed() {
    if (queryClient.getQueryState(queryKey)?.status !== 'error') return;

    await queryClient.refetchQueries({ queryKey, exact: true });
  }

  return { query, refetch, refetchIfFailed };
}
