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
import { type TodayEntry, todayQueryOptions } from '@/lib/intervalsQueries';
import type { WellnessRow } from '@/lib/wellness';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

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
  const { availability, credentials } = useIntervalsAvailability();
  const connection = useIntervalsConnection();
  const today = useToday();

  const lacksWellness = lacksScope(connection.scope, 'WELLNESS:READ');
  const readCredentials =
    connection.loading || lacksWellness ? null : credentials;
  const options = todayQueryOptions(readCredentials, today);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { state: toCardsState(availability, lacksWellness, query), refetch };
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
