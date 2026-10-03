import { type CalendarViewState, useCalendarRange } from './useCalendarRange';
import {
  endOfMonth,
  fetchMonth,
  isMonthFetched,
  startOfMonth,
} from '@/lib/calendarWorkouts';

export type { CalendarViewState };

export interface UseMonthlyCalendarResult {
  state: CalendarViewState;
  month: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  refresh: () => void;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function useMonthlyCalendar(): UseMonthlyCalendarResult {
  const { state, anchor, goToPrevious, goToNext, refresh } = useCalendarRange({
    initialAnchor: () => startOfMonth(new Date()),
    startOf: startOfMonth,
    endOf: endOfMonth,
    fetchRange: fetchMonth,
    isRangeFetched: isMonthFetched,
    step: addMonths,
  });

  return {
    state,
    month: anchor,
    goToPreviousMonth: goToPrevious,
    goToNextMonth: goToNext,
    refresh,
  };
}
