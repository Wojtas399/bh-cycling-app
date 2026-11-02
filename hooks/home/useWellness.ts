import { useCallback } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import { intervalsKeys, wellnessQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';
import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

/** What the Wellness card shows; `hidden` renders no card at all. */
export type WellnessCardState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'empty' }
  | { status: 'ready'; rows: WellnessRow[] };

/**
 * Today's Wellness Entry as the Wellness card's state. `today` follows the
 * clock, so a session that runs past midnight reads the new day. `refetch`
 * refetches this query alone, for pull-to-refresh.
 */
export function useWellness() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const queryClient = useQueryClient();

  const query = useQuery(wellnessQueryOptions(credentials, today));

  const athleteId = credentials?.athleteId;

  // Through the client, like `useUpcomingWorkouts`, so the tracked query
  // result only re-renders on what `toCardState` reads.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.wellness(athleteId, today),
        exact: true,
      }),
    [athleteId, queryClient, today],
  );

  return { state: toCardState(availability, query), refetch };
}

/**
 * A failed read hides only the card, so Home goes on without it. Rows already
 * shown for today stay up through a failed refetch.
 */
function toCardState(
  availability: IntervalsAvailability,
  { data, isError }: UseQueryResult<WellnessRow[]>,
): WellnessCardState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (data !== undefined) {
    return data.length === 0
      ? { status: 'empty' }
      : { status: 'ready', rows: data };
  }

  if (isError) return { status: 'hidden' };

  return { status: 'loading' };
}
