import { useState } from 'react';

import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from '@/hooks/useIntervalsAvailability';
import { useStableSelect } from '@/hooks/useStableSelect';
import { useToday } from '@/hooks/useToday';
import { bindSelectArgs } from '@/lib/bindSelectArgs';
import {
  type CombinedMonthResult,
  combineMonthResults,
} from '@/lib/combineMonthResults';
import { monthQueryOptions, selectMonth } from '@/lib/intervalsQueries';
import {
  type YearMonth,
  fromLocalDateString,
  toLocalDateString,
} from '@/lib/localDate';
import { useQueries } from '@tanstack/react-query';

export interface UseCalendarRangeResult {
  availability: IntervalsAvailability;
  query: CombinedMonthResult;
  anchor: Date;
  goToPrevious: () => void;
  goToNext: () => void;
  goToToday: () => void;
  showsToday: boolean;
}

export type CalendarRangeView = Pick<
  UseCalendarRangeResult,
  'availability' | 'query' | 'goToToday' | 'showsToday'
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
  const today = useToday();
  const [anchor, setAnchor] = useState(() =>
    startOf(startDate ?? fromLocalDateString(today)),
  );

  const combine = useStableSelect(combineRangeMonths, anchor, startOf, endOf);
  const select = useStableSelect(bindSelectArgs, selectMonth, today);

  const query = useQueries({
    queries: monthsFor(anchor).map(yearMonth =>
      monthQueryOptions(credentials, yearMonth, select),
    ),
    combine,
  });

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
  };
}
