import { useCallback, useMemo, useState } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import type { YearMonth } from '@/lib/calendarWorkouts';
import {
  type CombinedMonthResult,
  combineMonthResults,
} from '@/lib/combineMonthResults';
import {
  intervalsKeys,
  monthQueryOptions,
  selectMonthAsOf,
} from '@/lib/intervalsQueries';
import { fromLocalDateString, toLocalDateString } from '@/lib/localDate';
import { useQueries, useQueryClient } from '@tanstack/react-query';

export interface UseCalendarRangeResult {
  availability: IntervalsAvailability;
  /** The visible range's months combined into one query-shaped result. */
  query: CombinedMonthResult;
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  /** Moves to the range containing today. */
  goToToday: () => void;
  /** Today falls within the visible range. Kept current across midnight. */
  showsToday: boolean;
  refresh: () => void;
  /** Shown data is being fetched again, by a refresh or in the background. */
  refreshing: boolean;
}

/** What the Calendar screen renders from, whichever view is active. */
export type CalendarRangeView = Pick<
  UseCalendarRangeResult,
  | 'availability'
  | 'query'
  | 'goToToday'
  | 'showsToday'
  | 'refresh'
  | 'refreshing'
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
  const today = useToday();
  const [anchor, setAnchor] = useState(initialAnchor);

  // Stable per range, so `useQueries` only re-combines when a result changes.
  const combine = useMemo(
    () => combineMonthResults(startOf(anchor), endOf(anchor)),
    [anchor, startOf, endOf],
  );

  // Stable per day, so a month's statuses are only re-derived when it changes.
  const select = useMemo(() => selectMonthAsOf(today), [today]);

  const query = useQueries({
    queries: monthsFor(anchor).map(yearMonth =>
      monthQueryOptions(credentials, yearMonth, select),
    ),
    combine,
  });

  const athleteId = credentials?.athleteId;

  // Marks everything for the athlete stale: what's on screen fetches again
  // now, the rest when it's next shown. A failed fetch keeps the old data.
  const refresh = useCallback(() => {
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
    refresh,
    refreshing: query.data !== undefined && query.isFetching,
  };
}
