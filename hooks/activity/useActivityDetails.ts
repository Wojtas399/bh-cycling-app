import { useCallback } from 'react';

import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { buildActivityDetails } from '@/lib/activityDetails';
import {
  activityDetailsQueryOptions,
  intervalsKeys,
} from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * One Activity's details by its intervals.icu id, for Activity Details. The
 * screen gates on `availability` and branches on the raw `query`; `refetch`
 * refetches this query alone, for pull-to-refresh.
 */
export function useActivityDetails(activityId: string) {
  const { availability, credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();

  // `buildActivityDetails` is a stable module function and doesn't depend on
  // today, so the view model is only rebuilt when the data changes.
  const query = useQuery(
    activityDetailsQueryOptions(credentials, activityId, buildActivityDetails),
  );

  const athleteId = credentials?.athleteId;

  // Goes through the client rather than `query.refetch`: reading a property
  // off the tracked query result here would narrow which changes re-render.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.activity(athleteId, activityId),
        exact: true,
      }),
    [activityId, athleteId, queryClient],
  );

  return { availability, query, refetch };
}
