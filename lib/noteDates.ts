import { type LocalDateString, fromLocalDateString } from './localDate';
import { type Note, isMultiDay, noteLastDay } from './notes';

export interface NoteDateLabels {
  /** Monday first. */
  weekdaysShort: readonly string[];
  /** January first. */
  monthsShort: readonly string[];
}

/**
 * The days a Note covers, as its sheet's subtitle shows them: the weekday and
 * date for one day ("pon., 20 paź"), else the inclusive range, naming only
 * what changes ("20–24 paź", "30 paź – 2 lis", "30 gru 2026 – 2 sty 2027").
 */
export function formatNoteDates(note: Note, labels: NoteDateLabels): string {
  if (!isMultiDay(note)) return formatShortDate(note.start, labels);

  return formatDayRange(
    note,
    date => `${date.getDate()} ${labels.monthsShort[date.getMonth()]}`,
    '–',
  );
}

/** A date as the short weekday, the day and the short month: "czw., 22 paź". */
export function formatShortDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  const day = fromLocalDateString(date);
  // getDay() counts from Sunday; the labels start on Monday.
  const weekday = labels.weekdaysShort[(day.getDay() + 6) % 7];

  return `${weekday}, ${day.getDate()} ${labels.monthsShort[day.getMonth()]}`;
}

/**
 * A date as the short weekday, the day, the short month and the year:
 * "czw., 22 paź 2026".
 */
export function formatLongDate(
  date: LocalDateString,
  labels: NoteDateLabels,
): string {
  return `${formatShortDate(date, labels)} ${fromLocalDateString(date).getFullYear()}`;
}

/**
 * A multi-day Note's inclusive range in full month names, as a screen reader
 * and the day sheet's card say it: "24 – 27 października", or naming each
 * month or year that changes ("30 października – 2 listopada",
 * "30 grudnia 2026 – 2 stycznia 2027"). `monthNamesGenitive` is January first.
 */
export function formatNoteRange(
  note: Note,
  monthNamesGenitive: readonly string[],
): string {
  return formatDayRange(
    note,
    date => `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}`,
    ' – ',
  );
}

/** How a Note's card in the day sheet dates it. */
export interface DaySheetNoteDates {
  /** What a screen reader announces with the title. */
  when: string;
  /** The muted line under the title, a multi-day Note's range only. */
  subtitle: string | undefined;
}

/**
 * A one-day Note in the day sheet is dated by the sheet's day (`dayLabel`),
 * already its title, so it shows no subtitle; a multi-day one by its range
 * (see `formatNoteRange`), shown under its title as well.
 */
export function daySheetNoteDates(
  note: Note,
  dayLabel: string,
  monthNamesGenitive: readonly string[],
): DaySheetNoteDates {
  if (!isMultiDay(note)) return { when: dayLabel, subtitle: undefined };

  const range = formatNoteRange(note, monthNamesGenitive);

  return { when: range, subtitle: range };
}

/**
 * A Note's first to last day, naming only what changes: each year when it
 * spans two, each month when it spans two, else the month once, after the
 * last day, with `sameMonthDash` between the days ("20–24 paź").
 * `dayMonth` writes a day and its month.
 */
function formatDayRange(
  note: Note,
  dayMonth: (date: Date) => string,
  sameMonthDash: string,
): string {
  const first = fromLocalDateString(note.start);
  const last = fromLocalDateString(noteLastDay(note));

  if (first.getFullYear() !== last.getFullYear()) {
    return `${dayMonth(first)} ${first.getFullYear()} – ${dayMonth(last)} ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${dayMonth(first)} – ${dayMonth(last)}`;
  }

  return `${first.getDate()}${sameMonthDash}${dayMonth(last)}`;
}

/**
 * A multi-day Note's inclusive range as the week banner shows it: day and
 * zero-padded month, "24.10 – 27.10", "30.09 – 2.10".
 */
export function formatNoteShortRange(note: Note): string {
  const short = (date: Date) =>
    `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

  return `${short(fromLocalDateString(note.start))} – ${short(fromLocalDateString(noteLastDay(note)))}`;
}
