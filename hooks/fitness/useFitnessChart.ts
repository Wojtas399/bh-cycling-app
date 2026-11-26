import { type IntervalsRead, useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import { type FitnessDay, hasFitnessValues } from '@/lib/fitness';
import type { HealthDataConsentPrompt } from '@/lib/healthDataConsent';
import { fitnessQueryOptions } from '@/lib/intervalsQueries';

export type FitnessChartState =
  | { status: 'loading' }
  | { status: 'notConnected' }
  | { status: 'needsScope'; prompt: HealthDataConsentPrompt }
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
    readsHealthData: true,
  });

  return { state: toChartState(read), refetch: read.refetch };
}

function toChartState({
  availability,
  healthDataConsentPrompt,
  query: { data, isError },
}: IntervalsRead<FitnessDay[]>): FitnessChartState {
  if (availability === 'unavailable') return { status: 'notConnected' };

  if (healthDataConsentPrompt) {
    return { status: 'needsScope', prompt: healthDataConsentPrompt };
  }

  if (data !== undefined) {
    return data.some(hasFitnessValues)
      ? { status: 'ready', days: data }
      : { status: 'empty' };
  }

  return isError ? { status: 'error' } : { status: 'loading' };
}
