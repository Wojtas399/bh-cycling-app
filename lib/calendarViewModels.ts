import type { DayCountLabels } from './calendarDayCounts';
import { type CalendarDay, getMonthGrid } from './calendarGrid';
import type { CalendarItem, RaceItem } from './calendarItems';
import type { CalendarData } from './calendarMonth';
import type { LocalDateString } from './localDate';

export interface MonthWords {
  day: (day: CalendarDay) => string;
  dayCounts: DayCountLabels;
  untitledNote: string;
}

export interface DayPressTarget {
  kind: 'day';
  day: CalendarDay;
}

export interface NeighbouringMonthCell {
  inMonth: false;
  date: LocalDateString;
  dayOfMonth: number;
}

export interface InMonthCell {
  inMonth: true;
  date: LocalDateString;
  dayOfMonth: number;
  isToday: boolean;
  races: RaceItem[];
  markers: Exclude<CalendarItem, RaceItem>[];
  hasARace: boolean;
  hiddenNoteCount: number;
  label: string;
  press: DayPressTarget;
}

export type MonthCell = NeighbouringMonthCell | InMonthCell;

export interface MonthRow {
  cells: MonthCell[];
}

export function monthView(
  month: Date,
  _data: CalendarData,
  _today: LocalDateString,
  words: MonthWords,
): MonthRow[] {
  return getMonthGrid(month).map(week => ({
    cells: week.map(({ inMonth, ...day }): MonthCell => {
      if (!inMonth) {
        return { inMonth, date: day.date, dayOfMonth: day.dayOfMonth };
      }

      return {
        inMonth,
        date: day.date,
        dayOfMonth: day.dayOfMonth,
        isToday: false,
        races: [],
        markers: [],
        hasARace: false,
        hiddenNoteCount: 0,
        label: words.day(day),
        press: { kind: 'day', day },
      };
    }),
  }));
}
