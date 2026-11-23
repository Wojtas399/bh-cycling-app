import type { IntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import type { FitnessValues } from '@/lib/fitness';
import { isForbiddenError } from '@/lib/intervalsApi';
import { type TodayEntry, todayQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';
import type { UseQueryResult } from '@tanstack/react-query';

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
  const { availability, lacksScope, query, refetch } = useIntervalsRead({
    queryOptions: todayQueryOptions,
    args: [today],
    requiredScope: 'WELLNESS:READ',
  });

  return { state: toCardsState(availability, lacksScope, query), refetch };
}

function toCardsState(
  availability: IntervalsAvailability,
  lacksWellness: boolean,
  { data, error, isError }: UseQueryResult<TodayEntry>,
): TodayCardsState {
  if (availability === 'unavailable') return { status: 'hidden' };

  if (lacksWellness || isForbiddenError(error)) {
    return { status: 'needsScope' };
  }

  if (data !== undefined) return { status: 'ready', ...data };

  return isError ? { status: 'hidden' } : { status: 'loading' };
}
