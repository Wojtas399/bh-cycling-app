import { useCallback } from 'react';

import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import { intervalsKeys, upcomingQueryOptions } from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Home's items for today and tomorrow: Workouts, and today's Unplanned
 * Activities. `today` follows the clock, so a session
 * that runs past midnight fetches the new day. The screen gates on
 * `availability` and branches on the raw `query`; `refetch` refetches this
 * query alone, for pull-to-refresh.
 */
export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const queryClient = useQueryClient();

  const query = useQuery(upcomingQueryOptions(credentials, today));

  const athleteId = credentials?.athleteId;

  // Goes through the client rather than `query.refetch`: reading a property
  // off the tracked query result here would narrow which changes re-render.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.upcoming(athleteId, today),
        exact: true,
      }),
    [athleteId, queryClient, today],
  );

  return { availability, query, refetch };
}
