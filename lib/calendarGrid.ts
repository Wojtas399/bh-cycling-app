import {
  MONDAY_BASED_WEEKDAYS,
  type MondayBasedWeekday,
  daysSinceMonday,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from './calendarWorkouts';
import { type LocalDateString, addDays, toLocalDateString } from './localDate';

export type MonthIndex = number;

export interface CalendarDay {
  date: LocalDateString;
  dayOfMonth: number;
  weekday: MondayBasedWeekday;
  month: MonthIndex;
  year: number;
}

export interface CalendarGridCell extends CalendarDay {
  inMonth: boolean;
}

export function getWeekDays(anchor: Date): CalendarDay[] {
  const monday = startOfWeek(anchor);

  return MONDAY_BASED_WEEKDAYS.map(weekday => {
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

export function getMonthGrid(anchor: Date): CalendarGridCell[][] {
  const month = anchor.getMonth();
  const firstOfMonth = startOfMonth(anchor);
  const firstMonday = startOfWeek(firstOfMonth);
  const leadingDays = daysSinceMonday(firstOfMonth);
  const weekCount = Math.ceil((leadingDays + endOfMonth(anchor).getDate()) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    getWeekDays(addDays(firstMonday, week * 7)).map(day => ({
      ...day,
      inMonth: day.month === month,
    })),
  );
}
