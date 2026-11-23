import { EVENT_CATEGORY, type IntervalsCalendarEvent } from './intervalsApi';

export type LocalDateString = string;

export function toLocalDateString(date: Date): LocalDateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function fromLocalDateString(date: LocalDateString): Date {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

export function daysBetween(
  from: LocalDateString,
  to: LocalDateString,
): number {
  const utc = (date: LocalDateString) => {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
  };

  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function startOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function endOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
}

export const MONDAY_BASED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type MondayBasedWeekday = (typeof MONDAY_BASED_WEEKDAYS)[number];

export function daysSinceMonday(date: Date): MondayBasedWeekday {
  return MONDAY_BASED_WEEKDAYS[(date.getDay() + 6) % 7];
}

export function startOfWeek(anchor: Date): Date {
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - daysSinceMonday(anchor),
  );
}

export function endOfWeek(anchor: Date): Date {
  const monday = startOfWeek(anchor);

  return new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
}

export type YearMonth = string;

export function toYearMonth(date: Date): YearMonth {
  return toLocalDateString(date).slice(0, 7);
}

export function fromYearMonth(yearMonth: YearMonth): Date {
  const [year, month] = yearMonth.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

export function eachDate(oldest: Date, newest: Date): LocalDateString[] {
  const dayCount =
    daysBetween(toLocalDateString(oldest), toLocalDateString(newest)) + 1;

  return Array.from({ length: Math.max(dayCount, 0) }, (_, index) =>
    toLocalDateString(
      new Date(
        oldest.getFullYear(),
        oldest.getMonth(),
        oldest.getDate() + index,
      ),
    ),
  );
}

export interface DatedWorkoutEvent {
  event: IntervalsCalendarEvent;
  date: LocalDateString;
}

export function toSortedDatedWorkoutEvents(
  events: IntervalsCalendarEvent[],
): DatedWorkoutEvent[] {
  return events
    .filter(event => event.category === EVENT_CATEGORY.workout)
    .map(event => ({ event, date: event.start_date_local.slice(0, 10) }))
    .sort((a, b) =>
      a.event.start_date_local.localeCompare(b.event.start_date_local),
    );
}
