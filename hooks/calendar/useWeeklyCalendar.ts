import { type CalendarViewState, useCalendarRange } from './useCalendarRange';
import {
  endOfWeek,
  fetchWeek,
  isWeekFetched,
  startOfWeek,
} from '@/lib/calendarWorkouts';
import { addDays } from '@/lib/localDate';

export type { CalendarViewState };

export interface UseWeeklyCalendarResult {
  state: CalendarViewState;
  /** Monday of the currently visible week. */
  week: Date;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  refresh: () => void;
}

function addWeeks(date: Date, delta: number): Date {
  return addDays(date, delta * 7);
}

export function useWeeklyCalendar(): UseWeeklyCalendarResult {
  const { state, anchor, goToPrevious, goToNext, refresh } = useCalendarRange({
    initialAnchor: () => startOfWeek(new Date()),
    startOf: startOfWeek,
    endOf: endOfWeek,
    fetchRange: fetchWeek,
    isRangeFetched: isWeekFetched,
    step: addWeeks,
  });

  return {
    state,
    week: anchor,
    goToPreviousWeek: goToPrevious,
    goToNextWeek: goToNext,
    refresh,
  };
}
