import {
  type UseCalendarRangeResult,
  useCalendarRange,
} from './useCalendarRange';
import { endOfMonth, startOfMonth, toYearMonth } from '@/lib/calendarWorkouts';

export interface UseMonthlyCalendarResult {
  availability: UseCalendarRangeResult['availability'];
  query: UseCalendarRangeResult['query'];
  month: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  refresh: () => void;
  refreshing: boolean;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthsFor(month: Date): string[] {
  return [toYearMonth(month)];
}

export function useMonthlyCalendar(): UseMonthlyCalendarResult {
  const {
    availability,
    query,
    anchor,
    goToPrevious,
    goToNext,
    refresh,
    refreshing,
  } = useCalendarRange({
    initialAnchor: () => startOfMonth(new Date()),
    startOf: startOfMonth,
    endOf: endOfMonth,
    monthsFor,
    step: addMonths,
  });

  return {
    availability,
    query,
    month: anchor,
    goToPreviousMonth: goToPrevious,
    goToNextMonth: goToNext,
    refresh,
    refreshing,
  };
}
