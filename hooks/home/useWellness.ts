import { lacksScope } from '@/hooks/intervalsScopes';
import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import { isForbiddenError } from '@/lib/intervalsApi';
import { wellnessQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

/** What the Wellness card shows; `hidden` renders no card at all. */
export type WellnessCardState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'needsScope' }
  | { status: 'empty' }
  | { status: 'ready'; rows: WellnessRow[] };

/**
 * Today's Wellness Entry as the Wellness card's state, rather than the raw
 * query: the scope check adds states the query can't express (ADR 0010).
 * `today` follows the clock, so a session that runs past midnight reads the
 * new day. `refetch` refetches this query alone, for pull-to-refresh.
 */
export function useWellness() {
  const { availability, credentials } = useIntervalsAvailability();
  const connection = useIntervalsConnection();
  const today = useToday();

  // Skipped like a missing connection until the stored scope has arrived, and
  // when it lacks Wellness, so no request goes out to be refused.
  const lacksWellness = lacksScope(connection.scope, 'WELLNESS:READ');
  const readCredentials =
    connection.loading || lacksWellness ? null : credentials;
  const options = wellnessQueryOptions(readCredentials, today);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { state: toCardState(availability, lacksWellness, query), refetch };
}

/**
 * Wellness that can't be read for want of its scope asks to reconnect: the
 * stored scope says so up front, and a 403 says so once that scope has gone
 * stale (Wellness taken away in Intervals.icu's Connected Apps), even over
 * rows already shown. Any other failed read hides only the card, so Home goes
 * on without it, rows already shown for today included.
 */
function toCardState(
  availability: IntervalsAvailability,
  lacksWellness: boolean,
  { data, error, isError }: UseQueryResult<WellnessRow[]>,
): WellnessCardState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (lacksWellness || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (isError) return { status: 'hidden' };

  if (data === undefined) return { status: 'loading' };

  return data.length === 0
    ? { status: 'empty' }
    : { status: 'ready', rows: data };
}
