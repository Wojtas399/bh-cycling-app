import {
  type LocalDateString,
  fromLocalDateString,
  startOfMonth,
  startOfWeek,
  toYearMonth,
} from './localDate';

export const CALENDAR_VIEWS = ['monthly', 'weekly'] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export function otherViewStartDate(
  leaving: CalendarView,
  visibleRangeStart: Date,
  today: LocalDateString,
): Date {
  if (leaving === 'weekly') {
    return startOfMonth(visibleRangeStart);
  }

  const todayDate = fromLocalDateString(today);

  return toYearMonth(todayDate) === toYearMonth(visibleRangeStart)
    ? startOfWeek(todayDate)
    : startOfWeek(startOfMonth(visibleRangeStart));
}
