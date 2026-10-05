import { endOfMonth, startOfMonth, startOfWeek } from './calendarWorkouts';
import { addDays, toLocalDateString } from './localDate';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDay {
  /** Local calendar date, `YYYY-MM-DD` — the key into `workoutsByDate`. */
  date: string;
  dayOfMonth: number;
  /** Days since Monday: 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** 0-based, as in `Date#getMonth()`. */
  month: number;
  year: number;
}

export interface CalendarGridCell extends CalendarDay {
  /**
   * Whether the day belongs to the month the grid was built for. Padding days
   * from the neighbouring months are dimmed and never fetched, so they carry
   * no workouts.
   */
  inMonth: boolean;
}

/** Monday through Sunday of the week containing `anchor`. */
export function getWeekDays(anchor: Date): CalendarDay[] {
  const monday = startOfWeek(anchor);

  return Array.from({ length: 7 }, (_, weekday) => {
    const date = addDays(monday, weekday);

    return {
      date: toLocalDateString(date),
      dayOfMonth: date.getDate(),
      weekday,
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });
}

/**
 * The month containing `anchor` laid out as Monday-first weeks — as many as
 * it spans (4–6) — with the first and last week padded by days from the
 * neighbouring months.
 */
export function getMonthGrid(anchor: Date): CalendarGridCell[][] {
  const month = anchor.getMonth();
  const firstMonday = startOfWeek(startOfMonth(anchor));
  // Rounded because a DST change makes the gap 23 or 25 hours off a whole day.
  const leadingDays = Math.round(
    (startOfMonth(anchor).getTime() - firstMonday.getTime()) / DAY_MS,
  );
  const weekCount = Math.ceil((leadingDays + endOfMonth(anchor).getDate()) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    getWeekDays(addDays(firstMonday, week * 7)).map(day => ({
      ...day,
      inMonth: day.month === month,
    })),
  );
}
