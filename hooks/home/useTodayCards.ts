import { type IntervalsRead, useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import type { FitnessValues } from '@/lib/fitness';
import type { HealthDataConsentPrompt } from '@/lib/healthDataConsent';
import { isForbiddenError } from '@/lib/intervalsApi';
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
  query: { data, error, isError },
}: IntervalsRead<TodayEntry>): TodayCardsState {
  if (availability === 'unavailable') return { status: 'hidden' };

  const prompt =
    healthDataConsentPrompt ??
    (isForbiddenError(error) ? 'needsReauthorization' : null);

  if (prompt) return { status: 'needsScope', prompt };

  if (data !== undefined) return { status: 'ready', ...data };

  return isError ? { status: 'hidden' } : { status: 'loading' };
}
