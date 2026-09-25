import type { IntervalsCalendarEvent } from './intervalsApi';

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

export interface DatedWorkoutEvent {
  event: IntervalsCalendarEvent;
  /** Local calendar date the event is scheduled on, `YYYY-MM-DD`. */
  date: string;
}

/**
 * Filters calendar events down to WORKOUT-category ones, tags each with its
 * local calendar date, and orders them chronologically — the shared first
 * stage `deriveWorkoutStatuses` and `getUpcomingWorkouts` both build on
 * before applying their own filter/map.
 */
export function toSortedDatedWorkoutEvents(
  events: IntervalsCalendarEvent[],
): DatedWorkoutEvent[] {
  return events
    .filter(event => event.category === 'WORKOUT')
    .map(event => ({ event, date: event.start_date_local.slice(0, 10) }))
    .sort((a, b) =>
      a.event.start_date_local.localeCompare(b.event.start_date_local),
    );
}
