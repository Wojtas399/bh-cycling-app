import { type CalendarRangeView, useCalendarRange } from './useCalendarRange';
import {
  type YearMonth,
  endOfMonth,
  startOfMonth,
  toYearMonth,
} from '@/lib/localDate';

export interface UseMonthlyCalendarResult extends CalendarRangeView {
  month: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthsFor(month: Date): YearMonth[] {
  return [toYearMonth(month)];
}

export function useMonthlyCalendar(startDate?: Date): UseMonthlyCalendarResult {
  const { anchor, goToPrevious, goToNext, ...view } = useCalendarRange({
    startDate,
    startOf: startOfMonth,
    endOf: endOfMonth,
    monthsFor,
    step: addMonths,
  });

  return {
    ...view,
    month: anchor,
    goToPreviousMonth: goToPrevious,
    goToNextMonth: goToNext,
  };
}
