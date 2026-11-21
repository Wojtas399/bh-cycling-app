import { daysSinceMonday } from './calendarWorkouts';
import { type LocalDateString, fromLocalDateString } from './localDate';
import { type Note, isMultiDay, noteLastDay } from './notes';

export type WeekdayNamesFromMonday = readonly string[];

export type MonthNamesFromJanuary = readonly string[];

export interface NoteDateLabels {
  weekdaysShort: WeekdayNamesFromMonday;
  monthsShort: MonthNamesFromJanuary;
}

export function formatNoteDates(note: Note, labels: NoteDateLabels): string {
  if (!isMultiDay(note)) return formatShortDate(note.start, labels);

  return formatDayRange(
    note,
    date => `${date.getDate()} ${labels.monthsShort[date.getMonth()]}`,
    '–',
  );
}

export function formatShortDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  const day = fromLocalDateString(date);
  const weekday = labels.weekdaysShort[daysSinceMonday(day)];

  return `${weekday}, ${day.getDate()} ${labels.monthsShort[day.getMonth()]}`;
}

export function formatLongDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  return `${formatShortDate(date, labels)} ${fromLocalDateString(date).getFullYear()}`;
}

export function formatNoteRange(
  note: Note,
  monthNamesGenitive: MonthNamesFromJanuary,
): string {
  return formatDayRange(
    note,
    date => `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}`,
    ' – ',
  );
}

export interface DaySheetNoteDates {
  when: string;
  subtitle: string | undefined;
}

export function daySheetNoteDates(
  note: Note,
  dayLabel: string,
  monthNamesGenitive: MonthNamesFromJanuary,
): DaySheetNoteDates {
  if (!isMultiDay(note)) return { when: dayLabel, subtitle: undefined };

  const range = formatNoteRange(note, monthNamesGenitive);

  return { when: range, subtitle: range };
}

function formatDayRange(
  note: Note,
  formatDayAndMonth: (date: Date) => string,
  sameMonthDash: string,
): string {
  const first = fromLocalDateString(note.start);
  const last = fromLocalDateString(noteLastDay(note));

  if (first.getFullYear() !== last.getFullYear()) {
    return `${formatDayAndMonth(first)} ${first.getFullYear()} – ${formatDayAndMonth(last)} ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${formatDayAndMonth(first)} – ${formatDayAndMonth(last)}`;
  }

  return `${first.getDate()}${sameMonthDash}${formatDayAndMonth(last)}`;
}

export function formatNoteShortRange(note: Note): string {
  const dayAndPaddedMonth = (date: Date) =>
    `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

  return `${dayAndPaddedMonth(fromLocalDateString(note.start))} – ${dayAndPaddedMonth(fromLocalDateString(noteLastDay(note)))}`;
}
