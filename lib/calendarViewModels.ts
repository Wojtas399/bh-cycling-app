import {
  type DayCountLabels,
  dayCounts,
  dayMarkers,
  formatDayLabel,
} from './calendarDayCounts';
import { type CalendarDay, getMonthGrid, getWeekDays } from './calendarGrid';
import type {
  CalendarItem,
  RaceItem,
  UnplannedActivity,
} from './calendarItems';
import type { CalendarData } from './calendarMonth';
import {
  type LocalDateString,
  eachDate,
  endOfMonth,
  startOfMonth,
} from './localDate';
import { type NoteBarSegment, layoutNoteRow } from './noteBars';
import type {
  MonthNamesFromJanuary,
  WeekdayNamesFromMonday,
} from './noteDates';
import type { Note } from './notes';
import type { Race, RacePriority } from './races';
import type { LaneCrossing } from './weekNotes';
import type { CalendarWorkout, WorkoutStatus } from './workoutStatus';

export interface MonthWords {
  day: (day: CalendarDay) => string;
  dayCounts: DayCountLabels;
  untitledNote: string;
}

export interface FigureWords {
  duration: (seconds: number) => string;
  load: (load: number) => string;
}

export interface WeekWords extends Pick<MonthWords, 'day' | 'untitledNote'> {
  weekdaysShort: WeekdayNamesFromMonday;
  monthNamesGenitive: MonthNamesFromJanuary;
  todayRail: (dayLabel: string) => string;
  noteLabel: (title: string, when: string) => string;
  moreNotes: {
    shown: (count: number) => string;
    spoken: (count: number) => string;
  };
  stravaActivity: string;
  itemKind: {
    workout: (status: WorkoutStatus) => string;
    activity: string;
    race: (priority: RacePriority, paired: boolean) => string;
  };
  figures: { shown: FigureWords; spoken: FigureWords };
}

export interface DayPressTarget {
  kind: 'day';
  day: CalendarDay;
}

export type CalendarPressTarget =
  | { kind: 'workout'; workout: CalendarWorkout }
  | { kind: 'activity'; activity: UnplannedActivity }
  | { kind: 'race'; race: Race }
  | { kind: 'note'; note: Note }
  | DayPressTarget;

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

export interface RestRow {
  kind: 'rest';
  key: 'rest';
  press: undefined;
}

export type WeekRow = RestRow;

export interface WeekDay {
  date: LocalDateString;
  dayOfMonth: number;
  weekday: string;
  isToday: boolean;
  railLabel: string;
  crossings: LaneCrossing[];
  rows: WeekRow[];
  press: DayPressTarget;
}

export interface WeekViewModel {
  laneCount: number;
  days: WeekDay[];
}

export function weekView(
  week: Date,
  data: CalendarData,
  today: LocalDateString,
  words: WeekWords,
): WeekViewModel {
  return {
    laneCount: 0,
    days: getWeekDays(week).map(day => ({
      date: day.date,
      dayOfMonth: day.dayOfMonth,
      weekday: words.weekdaysShort[day.weekday].toUpperCase(),
      isToday: day.date === today,
      railLabel: words.day(day),
      crossings: [],
      rows: [{ kind: 'rest', key: 'rest', press: undefined }],
      press: { kind: 'day', day },
    })),
  };
}
