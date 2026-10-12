import {
  type UseCalendarRangeResult,
  useCalendarRange,
} from './useCalendarRange';
import { endOfWeek, startOfWeek, toYearMonth } from '@/lib/calendarWorkouts';
import { addDays } from '@/lib/localDate';

export interface UseWeeklyCalendarResult {
  availability: UseCalendarRangeResult['availability'];
  query: UseCalendarRangeResult['query'];
  /** Monday of the currently visible week. */
  week: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  refresh: () => void;
  refreshing: boolean;
}

function addWeeks(date: Date, delta: number): Date {
  return addDays(date, delta * 7);
}

/** The one month the week falls in, or both when it straddles a boundary. */
function monthsFor(week: Date): string[] {
  const first = toYearMonth(startOfWeek(week));
  const last = toYearMonth(endOfWeek(week));

  return first === last ? [first] : [first, last];
}

export function useWeeklyCalendar(): UseWeeklyCalendarResult {
  const {
    availability,
    query,
    anchor,
    goToPrevious,
    goToNext,
    refresh,
    refreshing,
  } = useCalendarRange({
    initialAnchor: () => startOfWeek(new Date()),
    startOf: startOfWeek,
    endOf: endOfWeek,
    monthsFor,
    step: addWeeks,
  });

  return {
    availability,
    query,
    week: anchor,
    goToPreviousWeek: goToPrevious,
    goToNextWeek: goToNext,
    refresh,
    refreshing,
  };
}
