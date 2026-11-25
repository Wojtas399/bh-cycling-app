import {
  type DayCountLabels,
  dayCounts,
  dayMarkers,
  formatDayLabel,
} from './calendarDayCounts';
import { type CalendarDay, getMonthGrid } from './calendarGrid';
import type { CalendarItem, RaceItem } from './calendarItems';
import type { CalendarData } from './calendarMonth';
import {
  type LocalDateString,
  eachDate,
  endOfMonth,
  startOfMonth,
} from './localDate';
import { type NoteBarSegment, layoutNoteRow } from './noteBars';
import type { Note } from './notes';

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

export interface MonthNoteBar extends NoteBarSegment {
  title: string;
}

export interface MonthRow {
  cells: MonthCell[];
  noteBars: MonthNoteBar[];
  laneCount: number;
}

export function monthView(
  month: Date,
  data: CalendarData,
  today: LocalDateString,
  words: MonthWords,
): MonthRow[] {
  const monthDates = eachDate(startOfMonth(month), endOfMonth(month));

  return getMonthGrid(month).map(week => {
    const { segments, overflowByDate } = layoutNoteRow(
      week.map(cell => cell.date),
      monthDates,
      data.notes,
    );

    return {
      cells: week.map(({ inMonth, ...day }): MonthCell => {
        if (!inMonth) {
          return { inMonth, date: day.date, dayOfMonth: day.dayOfMonth };
        }

        return {
          inMonth,
          date: day.date,
          dayOfMonth: day.dayOfMonth,
          isToday: day.date === today,
          ...dayMarkers(data.itemsByDate[day.date] ?? []),
          hiddenNoteCount: overflowByDate[day.date] ?? 0,
          label: formatDayLabel(
            words.day(day),
            dayCounts(data, day.date),
            words.dayCounts,
          ),
          press: { kind: 'day', day },
        };
      }),
      noteBars: segments.map(segment => ({
        ...segment,
        title: noteTitle(segment.note, words),
      })),
      laneCount: Math.max(0, ...segments.map(segment => segment.lane + 1)),
    };
  });
}

function noteTitle(note: Note, words: MonthWords): string {
  return note.name ?? words.untitledNote;
}
