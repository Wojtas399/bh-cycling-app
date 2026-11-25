import {
  type DayCountLabels,
  dayCounts,
  dayMarkers,
  formatDayLabel,
} from './calendarDayCounts';
import { type CalendarDay, getMonthGrid, getWeekDays } from './calendarGrid';
import {
  type CalendarItem,
  type RaceItem,
  type UnplannedActivity,
  calendarItemKey,
} from './calendarItems';
import type { CalendarData } from './calendarMonth';
import {
  type CompactItemRow,
  type CompactItemRowWords,
  compactItemRow,
} from './compactItemRow';
import {
  type LocalDateString,
  eachDate,
  endOfMonth,
  startOfMonth,
} from './localDate';
import { type NoteBarSegment, layoutNoteRow } from './noteBars';
import {
  type MonthNamesFromJanuary,
  type WeekdayNamesFromMonday,
  formatNoteRange,
  formatNoteShortRange,
} from './noteDates';
import type { Note } from './notes';
import type { Race } from './races';
import { type LaneCrossing, type NoteRow, weekNotes } from './weekNotes';
import type { CalendarWorkout } from './workoutStatus';

export interface MonthWords {
  day: (day: CalendarDay) => string;
  dayCounts: DayCountLabels;
  untitledNote: string;
}

export interface WeekWords
  extends Pick<MonthWords, 'day' | 'untitledNote'>, CompactItemRowWords {
  weekdaysShort: WeekdayNamesFromMonday;
  monthNamesGenitive: MonthNamesFromJanuary;
  todayRail: (dayLabel: string) => string;
  noteLabel: (title: string, when: string) => string;
  moreNotes: {
    shown: (count: number) => string;
    spoken: (count: number) => string;
  };
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
          press: dayPress(day),
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

function dayPress(day: CalendarDay): DayPressTarget {
  return { kind: 'day', day };
}

function noteTitle(
  note: Note,
  words: Pick<MonthWords, 'untitledNote'>,
): string {
  return note.name ?? words.untitledNote;
}

export interface RestRow {
  kind: 'rest';
  key: 'rest';
  press: undefined;
}

export interface ItemRow extends CompactItemRow {
  kind: 'item';
  key: string;
  press: CalendarPressTarget | undefined;
}

export type WeekNoteRow = {
  kind: 'note';
  key: string;
  note: Note;
  title: string;
  label: string;
  press: { kind: 'note'; note: Note };
} & ({ multiDay: false } | { multiDay: true; shortRange: string });

export interface MoreNotesRow {
  kind: 'moreNotes';
  key: 'more-notes';
  count: number;
  text: string;
  label: string;
  press: DayPressTarget;
}

export type WeekRow = WeekNoteRow | MoreNotesRow | ItemRow | RestRow;

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
  const days = getWeekDays(week);
  const notes = weekNotes(
    data.notes,
    days.map(day => day.date),
  );

  return {
    laneCount: notes.lanes.length,
    days: days.map(day => {
      const isToday = day.date === today;
      const dayLabel = words.day(day);
      const { crossings, rows, hiddenCount } = notes.days[day.date];
      const press = dayPress(day);

      return {
        date: day.date,
        dayOfMonth: day.dayOfMonth,
        weekday: words.weekdaysShort[day.weekday].toUpperCase(),
        isToday,
        railLabel: isToday ? words.todayRail(dayLabel) : dayLabel,
        crossings,
        rows: [
          ...rows.map(row => noteRow(row, dayLabel, words)),
          ...moreNotesRows(hiddenCount, press, words),
          ...itemRowsOrRest(data.itemsByDate[day.date] ?? [], words),
        ],
        press,
      };
    }),
  };
}

function noteRow(
  { note, multiDay }: NoteRow,
  dayLabel: string,
  words: WeekWords,
): WeekNoteRow {
  const title = noteTitle(note, words);
  const when = multiDay
    ? formatNoteRange(note, words.monthNamesGenitive)
    : dayLabel;

  return {
    kind: 'note',
    key: `note-${note.id}`,
    note,
    title,
    label: words.noteLabel(title, when),
    press: { kind: 'note', note },
    ...(multiDay
      ? { multiDay, shortRange: formatNoteShortRange(note) }
      : { multiDay }),
  };
}

function moreNotesRows(
  count: number,
  press: DayPressTarget,
  words: WeekWords,
): MoreNotesRow[] {
  if (count === 0) return [];

  return [
    {
      kind: 'moreNotes',
      key: 'more-notes',
      count,
      text: words.moreNotes.shown(count),
      label: words.moreNotes.spoken(count),
      press,
    },
  ];
}

function itemRowsOrRest(items: CalendarItem[], words: WeekWords): WeekRow[] {
  if (items.length === 0) {
    return [{ kind: 'rest', key: 'rest', press: undefined }];
  }

  return items.map(item => itemRow(item, words));
}

function itemRow(item: CalendarItem, words: WeekWords): ItemRow {
  return {
    kind: 'item',
    key: calendarItemKey(item),
    ...compactItemRow(item, words),
    press: itemPress(item),
  };
}

function itemPress(item: CalendarItem): CalendarPressTarget | undefined {
  switch (item.kind) {
    case 'workout':
      return { kind: 'workout', workout: item.workout };
    case 'race':
      return item.activity
        ? { kind: 'activity', activity: item.activity }
        : { kind: 'race', race: item.race };
    case 'activity':
      return item.activity.isStravaActivity
        ? undefined
        : { kind: 'activity', activity: item.activity };
  }
}
