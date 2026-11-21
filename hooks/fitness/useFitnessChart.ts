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

export type FitnessChartState =
  | { status: 'loading' }
  | { status: 'notConnected' }
  | { status: 'needsScope' }
  | { status: 'error' }
  | { status: 'empty' }
  | {
      status: 'ready';
      days: FitnessDay[];
    };

export function useFitnessChart() {
  const { availability, credentials } = useIntervalsAvailability();
  const connection = useIntervalsConnection();
  const today = useToday();

  const lacksWellness = lacksScope(connection.scope, 'WELLNESS:READ');
  const options = fitnessQueryOptions(
    lacksWellness ? null : credentials,
    today,
  );

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { state: toChartState(availability, lacksWellness, query), refetch };
}

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
