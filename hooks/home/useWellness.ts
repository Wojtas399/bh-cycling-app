import { useCallback } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useToday } from '@/hooks/useToday';
import { isForbiddenError } from '@/lib/intervalsApi';
import { intervalsKeys, wellnessQueryOptions } from '@/lib/intervalsQueries';
import { type WellnessRow, lacksWellnessScope } from '@/lib/wellness';
import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

/** What the Wellness card shows; `hidden` renders no card at all. */
export type WellnessCardState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'needsScope' }
  | { status: 'empty' }
  | { status: 'ready'; rows: WellnessRow[] };

/**
 * Today's Wellness Entry as the Wellness card's state. `today` follows the
 * clock, so a session that runs past midnight reads the new day. `refetch`
 * refetches this query alone, for pull-to-refresh.
 */
export function useWellness() {
  const { availability, credentials } = useIntervalsAvailability();
  const connection = useIntervalsConnection();
  const today = useToday();
  const queryClient = useQueryClient();

  // Skipped like a missing connection until the stored scope has arrived, and
  // when it lacks Wellness, so no request goes out to be refused.
  const lacksScope = lacksWellnessScope(connection.scope);
  const readCredentials = connection.loading || lacksScope ? null : credentials;
  const query = useQuery(wellnessQueryOptions(readCredentials, today));

  const athleteId = readCredentials?.athleteId;

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

  return { state: toCardState(availability, lacksScope, query), refetch };
}

/**
 * Wellness that can't be read for want of its scope asks to reconnect: the
 * stored scope says so up front, and a 403 says so once that scope has gone
 * stale (Wellness taken away in Intervals.icu's Connected Apps), even over
 * rows already shown. Any other failed read hides only the card, so Home goes
 * on without it, and rows already shown for today stay up through it.
 */
function toCardState(
  availability: IntervalsAvailability,
  lacksScope: boolean,
  { data, error, isError }: UseQueryResult<WellnessRow[]>,
): WellnessCardState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (lacksScope || isForbiddenError(error)) return { status: 'needsScope' };

  if (data !== undefined) {
    return data.length === 0
      ? { status: 'empty' }
      : { status: 'ready', rows: data };
  }

  if (isError) return { status: 'hidden' };

  return { status: 'loading' };
}
