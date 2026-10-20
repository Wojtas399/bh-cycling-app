import { useCallback } from 'react';

import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { intervalsKeys, routeQueryOptions } from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The Route of a Workout's paired Activity, by the Activity's intervals.icu
 * id (`WorkoutDetails.route.activityId`). Skipped for a `null` id. `data` is
 * `null` when the Activity turns out to have no Route. `refetch` refetches
 * this query alone; `refetchIfFailed` does too, but only when it's in error,
 * and otherwise resolves immediately, so pull-to-refresh never downloads a
 * loaded Route again.
 */
export function useWorkoutRoute(activityId: string | null) {
  const { credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();

  const query = useQuery(routeQueryOptions(credentials, activityId));

  const athleteId = credentials?.athleteId;

  // Goes through the client rather than `query.refetch`, as in
  // `useWorkoutDetails`, so the tracked query result isn't widened.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.route(athleteId, activityId),
        exact: true,
      }),
    [activityId, athleteId, queryClient],
  );

  const refetchIfFailed = useCallback(async () => {
    const queryKey = intervalsKeys.route(athleteId, activityId);

    if (queryClient.getQueryState(queryKey)?.status !== 'error') return;

    await queryClient.refetchQueries({ queryKey, exact: true });
  }, [activityId, athleteId, queryClient]);

  return { query, refetch, refetchIfFailed };
}
