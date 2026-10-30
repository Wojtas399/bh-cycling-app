import { startOfMonth, startOfWeek, toYearMonth } from './calendarWorkouts';
import { type LocalDateString, fromLocalDateString } from './localDate';

export const CALENDAR_VIEWS = ['monthly', 'weekly'] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/**
 * Where the other view opens when the user leaves `leaving`, so switching
 * keeps their place. `anchor` is the visible range's: the month's 1st or the
 * week's Monday.
 *
 * - Month → week: the week containing today if today is in the visible
 *   month, otherwise the week containing the month's 1st (whose Monday may
 *   be in the previous month).
 * - Week → month: the month containing the week's Monday.
 */
export function otherViewStartDate(
  leaving: CalendarView,
  anchor: Date,
  today: LocalDateString,
): Date {
  if (leaving === 'weekly') {
    return startOfMonth(anchor);
  }

  const todayDate = fromLocalDateString(today);

  return toYearMonth(todayDate) === toYearMonth(anchor)
    ? startOfWeek(todayDate)
    : startOfWeek(startOfMonth(anchor));
}
