import { type IntervalsRead, useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import type { FitnessValues } from '@/lib/fitness';
import type { HealthDataConsentPrompt } from '@/lib/healthDataConsent';
import { type TodayEntry, todayQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';

export type TodayCardsState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'needsScope'; prompt: HealthDataConsentPrompt }
  | {
      status: 'ready';
      fitness: FitnessValues | null;
      wellness: WellnessRow[];
    };

export type ShownTodayCardsState = Extract<
  TodayCardsState,
  { status: 'loading' | 'ready' }
>;

export function useTodayCards() {
  const today = useToday();
  const read = useIntervalsRead({
    queryOptions: todayQueryOptions,
    args: [today],
    readsHealthData: true,
  });

  return { state: toCardsState(read) };
}

function toCardsState({
  availability,
  healthDataConsentPrompt,
  query: { data, isError },
}: IntervalsRead<TodayEntry>): TodayCardsState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (healthDataConsentPrompt) {
    return { status: 'needsScope', prompt: healthDataConsentPrompt };
  }

  if (data !== undefined) return { status: 'ready', ...data };

  return isError ? { status: 'hidden' } : { status: 'loading' };
}
