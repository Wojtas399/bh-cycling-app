import { endOfMonth, startOfMonth, startOfWeek } from './calendarWorkouts';
import { addDays, toLocalDateString } from './localDate';

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

function toCalendarDay(date: Date, weekday: number): CalendarDay {
  return {
    date: toLocalDateString(date),
    dayOfMonth: date.getDate(),
    weekday,
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

/** Monday through Sunday of the week containing `anchor`. */
export function getWeekDays(anchor: Date): CalendarDay[] {
  const monday = startOfWeek(anchor);

  return Array.from({ length: 7 }, (_, weekday) =>
    toCalendarDay(addDays(monday, weekday), weekday),
  );
}

/**
 * The month containing `anchor` laid out as Monday-first weeks — as many as
 * it spans (4–6) — with the first and last week padded by days from the
 * neighbouring months.
 */
export function getMonthGrid(anchor: Date): CalendarGridCell[][] {
  const month = anchor.getMonth();
  const firstMonday = startOfWeek(startOfMonth(anchor));
  const leadingDays = (startOfMonth(anchor).getDay() + 6) % 7; // days since Monday
  const weekCount = Math.ceil((leadingDays + endOfMonth(anchor).getDate()) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    getWeekDays(addDays(firstMonday, week * 7)).map(day => ({
      ...day,
      inMonth: day.month === month,
    })),
  );
}
