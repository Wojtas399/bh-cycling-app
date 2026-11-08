import { lacksScope } from '@/hooks/intervalsScopes';
import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import { type FitnessDay, hasFitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import { fitnessQueryOptions } from '@/lib/intervalsQueries';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

/** What the "Fitness i zmęczenie" screen shows. */
export type FitnessChartState =
  | { status: 'loading' }
  | { status: 'notConnected' }
  | { status: 'needsScope' }
  | { status: 'error' }
  | { status: 'empty' }
  | {
      status: 'ready';
      /** The year ending today, oldest first, a day for every date. */
      days: FitnessDay[];
    };

/**
 * The year of Fitness as the chart screen's state, rather than the raw query:
 * the scope check adds states the query can't express (ADR 0010). `today`
 * follows the clock, so a session that runs past midnight reads the new day.
 * `refetch` refetches the year, for pull-to-refresh and the retry.
 */
export function useFitnessChart() {
  const { availability, credentials } = useIntervalsAvailability();
  const connection = useIntervalsConnection();
  const today = useToday();

  // Skipped like a missing connection when the stored scope lacks Wellness,
  // so no request goes out to be refused.
  const lacksWellness = lacksScope(connection.scope, 'WELLNESS:READ');
  const options = fitnessQueryOptions(
    lacksWellness ? null : credentials,
    today,
  );

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { state: toChartState(availability, lacksWellness, query), refetch };
}

/**
 * Fitness that can't be read for want of its scope asks to reconnect: the
 * stored scope says so up front, and a 403 says so once that scope has gone
 * stale, even over a chart already shown. Any other failure keeps a chart
 * already shown, and offers a retry when there is none. A year without a day
 * with values is empty, not an error.
 */
function toChartState(
  availability: IntervalsAvailability,
  lacksWellness: boolean,
  { data, error, isError }: UseQueryResult<FitnessDay[]>,
): FitnessChartState {
  if (availability === 'unavailable') return { status: 'notConnected' };

  if (lacksWellness || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (data !== undefined) {
    return data.some(hasFitnessValues)
      ? { status: 'ready', days: data }
      : { status: 'empty' };
  }

  return isError ? { status: 'error' } : { status: 'loading' };
}
