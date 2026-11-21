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
