import { type IntervalsRead, useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import { type FitnessDay, hasFitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import { fitnessQueryOptions } from '@/lib/intervalsQueries';

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
  const read = useIntervalsRead({
    queryOptions: fitnessQueryOptions,
    args: [today],
    requiredScope: 'WELLNESS:READ',
  });

  return { state: toChartState(read), refetch: read.refetch };
}

function toChartState({
  availability,
  lacksScope,
  query: { data, error, isError },
}: IntervalsRead<FitnessDay[]>): FitnessChartState {
  if (availability === 'unavailable') return { status: 'notConnected' };

  if (lacksScope || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (data !== undefined) {
    return data.some(hasFitnessValues)
      ? { status: 'ready', days: data }
      : { status: 'empty' };
  }

  return isError ? { status: 'error' } : { status: 'loading' };
}
