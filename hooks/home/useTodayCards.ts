import { type IntervalsRead, useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import type { FitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import { type TodayEntry, todayQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';

export type TodayCardsState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'needsScope' }
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
    requiredScope: 'WELLNESS:READ',
  });

  return { state: toCardsState(read), refetch: read.refetch };
}

function toCardsState({
  availability,
  lacksScope,
  query: { data, error, isError },
}: IntervalsRead<TodayEntry>): TodayCardsState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (lacksScope || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (data !== undefined) return { status: 'ready', ...data };

  return isError ? { status: 'hidden' } : { status: 'loading' };
}
