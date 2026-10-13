import { useCallback, useMemo, useState } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import type { YearMonth } from '@/lib/calendarWorkouts';
import {
  type CombinedMonthResult,
  combineMonthResults,
} from '@/lib/combineMonthResults';
import { intervalsKeys, monthQueryOptions } from '@/lib/intervalsQueries';
import { useQueries, useQueryClient } from '@tanstack/react-query';

export interface UseCalendarRangeResult {
  availability: IntervalsAvailability;
  /** The visible range's months combined into one query-shaped result. */
  query: CombinedMonthResult;
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  refresh: () => void;
  /** A refresh the athlete asked for is in flight; background fetches aren't. */
  refreshing: boolean;
}

/** What the Calendar screen renders from, whichever view is active. */
export type CalendarRangeView = Pick<
  UseCalendarRangeResult,
  'availability' | 'query' | 'refresh' | 'refreshing'
>;

/**
 * Configures `useCalendarRange` for a specific range shape (month, week, ...).
 * `step` receives `-1`/`1` and is expected to move `anchor` by one unit of
 * that range in the given direction. `monthsFor` lists the months the range
 * touches, each cached as its own query.
 */
export interface UseCalendarRangeConfig {
  initialAnchor: () => Date;
  startOf: (anchor: Date) => Date;
  endOf: (anchor: Date) => Date;
  monthsFor: (anchor: Date) => YearMonth[];
  step: (anchor: Date, direction: -1 | 1) => Date;
}

export function useCalendarRange({
  initialAnchor,
  startOf,
  endOf,
  monthsFor,
  step,
}: UseCalendarRangeConfig): UseCalendarRangeResult {
  const { availability, credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState(initialAnchor);
  const [userRefreshing, setUserRefreshing] = useState(false);

  // Stable per range, so `useQueries` only re-combines when a result changes.
  const combine = useMemo(
    () => combineMonthResults(startOf(anchor), endOf(anchor)),
    [anchor, startOf, endOf],
  );

  const query = useQueries({
    queries: monthsFor(anchor).map(yearMonth =>
      monthQueryOptions(credentials, yearMonth),
    ),
    combine,
  });

  const athleteId = credentials?.athleteId;

  // Marks every month stale: the visible ones fetch again now, the rest when
  // they're next shown. A failed fetch keeps the month's data.
  const refresh = useCallback(() => {
    if (!athleteId) return;

    setUserRefreshing(true);
    queryClient
      .invalidateQueries({ queryKey: intervalsKeys.calendar(athleteId) })
      .finally(() => setUserRefreshing(false));
  }, [athleteId, queryClient]);

  return {
    availability,
    query,
    anchor,
    goToPrevious: () => setAnchor(current => step(current, -1)),
    goToNext: () => setAnchor(current => step(current, 1)),
    refresh,
    refreshing: userRefreshing,
  };
}
