import { useCallback, useMemo } from 'react';

import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import {
  intervalsKeys,
  selectWorkoutDetailsAsOf,
  workoutDetailsQueryOptions,
} from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * One Workout's details by its intervals.icu event id. The Workout Status
 * follows `today`, so a planned Workout turns missed at midnight without a
 * fetch. The screen gates on `availability` and branches on the raw `query`;
 * `refetch` refetches this query alone, for pull-to-refresh.
 */
export function useWorkoutDetails(eventId: number) {
  const { availability, credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const today = useToday();

  // Stable per day, so the view model is only rebuilt when the day changes.
  const select = useMemo(() => selectWorkoutDetailsAsOf(today), [today]);

  const query = useQuery(
    workoutDetailsQueryOptions(credentials, eventId, select),
  );

  const athleteId = credentials?.athleteId;

  // Goes through the client rather than `query.refetch`: reading a property
  // off the tracked query result here would narrow which changes re-render.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.workout(athleteId, eventId),
        exact: true,
      }),
    [athleteId, eventId, queryClient],
  );

  return { availability, query, refetch };
}
