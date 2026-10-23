import { fromLocalDateString } from './localDate';
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
  const first = fromLocalDateString(note.start);
  const day = (date: Date) => date.getDate();
  const month = (date: Date) => labels.monthsShort[date.getMonth()];

  if (!isMultiDay(note)) {
    // getDay() counts from Sunday; the labels start on Monday.
    const weekday = labels.weekdaysShort[(first.getDay() + 6) % 7];

    return `${weekday}, ${day(first)} ${month(first)}`;
  }

  const last = fromLocalDateString(noteLastDay(note));

  if (first.getFullYear() !== last.getFullYear()) {
    return `${day(first)} ${month(first)} ${first.getFullYear()} – ${day(last)} ${month(last)} ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${day(first)} ${month(first)} – ${day(last)} ${month(last)}`;
  }

  return `${day(first)}–${day(last)} ${month(last)}`;
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
  const first = fromLocalDateString(note.start);
  const last = fromLocalDateString(noteLastDay(note));
  const dayOfMonth = (date: Date) =>
    `${date.getDate()} ${monthNamesGenitive[date.getMonth()]}`;

  if (first.getFullYear() !== last.getFullYear()) {
    return `${dayOfMonth(first)} ${first.getFullYear()} – ${dayOfMonth(last)} ${last.getFullYear()}`;
  }

  if (first.getMonth() !== last.getMonth()) {
    return `${dayOfMonth(first)} – ${dayOfMonth(last)}`;
  }

  return `${first.getDate()} – ${dayOfMonth(last)}`;
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
