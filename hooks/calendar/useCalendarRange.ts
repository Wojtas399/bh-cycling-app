import { useCallback, useState } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useStableSelect } from '@/hooks/useStableSelect';
import { useToday } from '@/hooks/useToday';
import {
  type CombinedMonthResult,
  combineMonthResults,
} from '@/lib/combineMonthResults';
import {
  intervalsKeys,
  monthQueryOptions,
  selectMonthAsOf,
} from '@/lib/intervalsQueries';
import {
  type YearMonth,
  fromLocalDateString,
  toLocalDateString,
} from '@/lib/localDate';
import { useQueries, useQueryClient } from '@tanstack/react-query';

export interface UseCalendarRangeResult {
  availability: IntervalsAvailability;
  query: CombinedMonthResult;
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  goToToday: () => void;
  showsToday: boolean;
  refresh: () => void;
  refreshing: boolean;
}

export type CalendarRangeView = Pick<
  UseCalendarRangeResult,
  | 'availability'
  | 'query'
  | 'goToToday'
  | 'showsToday'
  | 'refresh'
  | 'refreshing'
>;

export interface UseCalendarRangeConfig {
  startDate?: Date;
  startOf: (anchor: Date) => Date;
  endOf: (anchor: Date) => Date;
  monthsFor: (anchor: Date) => YearMonth[];
  step: (anchor: Date, direction: -1 | 1) => Date;
}

function combineRangeMonths(
  anchor: Date,
  startOf: (anchor: Date) => Date,
  endOf: (anchor: Date) => Date,
) {
  return combineMonthResults(startOf(anchor), endOf(anchor));
}

export function useCalendarRange({
  startDate,
  startOf,
  endOf,
  monthsFor,
  step,
}: UseCalendarRangeConfig): UseCalendarRangeResult {
  const { availability, credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const today = useToday();
  const [anchor, setAnchor] = useState(() =>
    startOf(startDate ?? fromLocalDateString(today)),
  );

  const combine = useStableSelect(combineRangeMonths, anchor, startOf, endOf);
  const select = useStableSelect(selectMonthAsOf, today);

  const query = useQueries({
    queries: monthsFor(anchor).map(yearMonth =>
      monthQueryOptions(credentials, yearMonth, select),
    ),
    combine,
  });

  const athleteId = credentials?.athleteId;

  const markAthleteDataStale = useCallback(() => {
    if (!athleteId) return;

    queryClient.invalidateQueries({
      queryKey: intervalsKeys.athlete(athleteId),
    });
  }, [athleteId, queryClient]);

  return {
    availability,
    query,
    anchor,
    goToPrevious: () => setAnchor(current => step(current, -1)),
    goToNext: () => setAnchor(current => step(current, 1)),
    goToToday: () => setAnchor(startOf(fromLocalDateString(today))),
    showsToday:
      toLocalDateString(startOf(anchor)) <= today &&
      today <= toLocalDateString(endOf(anchor)),
    refresh: markAthleteDataStale,
    refreshing: query.data !== undefined && query.isFetching,
  };
}
