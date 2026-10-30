import { type CalendarRangeView, useCalendarRange } from './useCalendarRange';
import {
  type YearMonth,
  endOfWeek,
  startOfWeek,
  toYearMonth,
} from '@/lib/calendarWorkouts';
import { addDays } from '@/lib/localDate';

export interface UseWeeklyCalendarResult extends CalendarRangeView {
  /** Monday of the currently visible week. */
  week: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
}

function addWeeks(date: Date, delta: number): Date {
  return addDays(date, delta * 7);
}

/** The one month the week falls in, or both when it straddles a boundary. */
function monthsFor(week: Date): YearMonth[] {
  const first = toYearMonth(startOfWeek(week));
  const last = toYearMonth(endOfWeek(week));

  return first === last ? [first] : [first, last];
}

/** Opens on the week containing `startDate`, or today's week without one. */
export function useWeeklyCalendar(startDate?: Date): UseWeeklyCalendarResult {
  const { anchor, goToPrevious, goToNext, ...view } = useCalendarRange({
    startDate,
    startOf: startOfWeek,
    endOf: endOfWeek,
    monthsFor,
    step: addWeeks,
  });

  return {
    ...view,
    week: anchor,
    goToPreviousWeek: goToPrevious,
    goToNextWeek: goToNext,
  };
}
