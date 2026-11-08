import { EVENT_CATEGORY, type IntervalsCalendarEvent } from './intervalsApi';

/** A local calendar date, `YYYY-MM-DD`. */
export type LocalDateString = string;

export function toLocalDateString(date: Date): LocalDateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Local midnight of a `YYYY-MM-DD` date. */
export function fromLocalDateString(date: LocalDateString): Date {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

/**
 * Whole calendar days from `from` to `to`, negative when `to` is earlier.
 * Counted on the calendar fields, so a DST shift can never skew it.
 */
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

export interface DatedWorkoutEvent {
  event: IntervalsCalendarEvent;
  /** Local calendar date the event is scheduled on, `YYYY-MM-DD`. */
  date: string;
}

/**
 * Filters calendar events down to WORKOUT-category ones, tags each with its
 * local calendar date, and orders them chronologically — the first stage
 * `joinCalendarItems` builds on.
 */
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
