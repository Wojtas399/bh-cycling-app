import { lacksScope } from '@/hooks/intervalsScopes';
import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import type { FitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import {
  type TodayWellness,
  wellnessQueryOptions,
} from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

/**
 * What Home's two top cards, Fitness and Wellness, show. They share one read,
 * so they load, hide and ask for the scope together; `hidden` renders neither.
 */
export type TodayCardsState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'needsScope' }
  | {
      status: 'ready';
      /** `null` → the Fitness card's "no data today" line. */
      fitness: FitnessValues | null;
      /** None → the Wellness card's "no data today" line. */
      wellness: WellnessRow[];
    };

/** The states in which the cards themselves render. */
export type ShownTodayCardsState = Extract<
  TodayCardsState,
  { status: 'loading' | 'ready' }
>;

/**
 * Today's Wellness Entry as the state of Home's top cards, rather than the raw
 * query: the scope check adds states the query can't express (ADR 0010).
 * `today` follows the clock, so a session that runs past midnight reads the
 * new day. `refetch` refetches this query alone, for pull-to-refresh.
 */
export function useTodayCards() {
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

  return { state: toCardsState(availability, lacksWellness, query), refetch };
}

/**
 * Wellness that can't be read for want of its scope asks to reconnect: the
 * stored scope says so up front, and a 403 says so once that scope has gone
 * stale (Wellness taken away in Intervals.icu's Connected Apps), even over
 * values already shown. Any other failed read hides only the top cards, so
 * Home goes on without them.
 */
function toCardsState(
  availability: IntervalsAvailability,
  lacksWellness: boolean,
  { data, error, isError }: UseQueryResult<TodayWellness>,
): TodayCardsState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (lacksWellness || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (data !== undefined) return { status: 'ready', ...data };

  return isError ? { status: 'hidden' } : { status: 'loading' };
}
