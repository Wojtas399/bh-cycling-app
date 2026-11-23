import type { IntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import { type FitnessDay, hasFitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import { fitnessQueryOptions } from '@/lib/intervalsQueries';
import type { UseQueryResult } from '@tanstack/react-query';

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
  const today = useToday();
  const { availability, lacksScope, query, refetch } = useIntervalsRead({
    queryOptions: fitnessQueryOptions,
    args: [today],
    requiredScope: 'WELLNESS:READ',
  });

  return { state: toChartState(availability, lacksScope, query), refetch };
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
