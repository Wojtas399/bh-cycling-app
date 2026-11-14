import { EVENT_CATEGORY, type IntervalsCalendarEvent } from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';

/**
 * A Note from the athlete's Intervals.icu calendar, for one day or a range of
 * days. Empty or whitespace-only text is `null`, so screens only check for
 * `null`.
 */
export interface Note {
  id: number;
  name: string | null;
  description: string | null;
  /** A hex colour set on intervals.icu, or `null` for none. */
  color: string | null;
  /** The first day the Note covers. */
  start: LocalDateString;
  /** The day after the last one the Note covers (exclusive). */
  end: LocalDateString;
}

function textOrNull(value: string | null | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

function nextDay(date: LocalDateString): LocalDateString {
  return toLocalDateString(addDays(fromLocalDateString(date), 1));
}

/**
 * A calendar event as `toNotes` reads it: on a Note, intervals.icu may send
 * the name and text as `null`, `""` or not at all, where Workouts always
 * carry a string. Every `IntervalsCalendarEvent` is one.
 */
export type NoteEvent = Omit<IntervalsCalendarEvent, 'name' | 'description'> & {
  name?: string | null;
  description?: string | null;
};

/** Orders Notes by `id`, i.e. by creation. */
export function byNoteId(a: Note, b: Note): number {
  return a.id - b.id;
}

/**
 * The NOTE-category events as Notes, in `id` (creation) order. Every `Note[]`
 * in the app starts here, so functions taking Notes may rely on that order;
 * only merging lists (see `combineMonthResults`) has to sort again. A missing
 * `end`, or one no later than the start, makes the Note cover its start day
 * only.
 */
export function toNotes(events: NoteEvent[]): Note[] {
  return events
    .filter(event => event.category === EVENT_CATEGORY.note)
    .map((event): Note => {
      const start = event.start_date_local.slice(0, 10);
      const end = event.end_date_local?.slice(0, 10);

      return {
        id: event.id,
        name: textOrNull(event.name),
        description: textOrNull(event.description),
        color: textOrNull(event.color),
        start,
        end: end && end > start ? end : nextDay(start),
      };
    })
    .sort(byNoteId);
}

/**
 * How far before a range the Notes are fetched. intervals.icu filters events
 * by start date only, so a Note that started earlier but still covers the
 * range would otherwise be missed. A Note longer than this that started
 * before the look-back is a documented gap.
 */
export const NOTE_LOOK_BACK_DAYS = 31;

/** The fetch window for the Notes covering `first`..`last`. */
export function noteWindow(
  first: Date,
  last: Date,
): { oldest: LocalDateString; newest: LocalDateString } {
  return {
    oldest: toLocalDateString(addDays(first, -NOTE_LOOK_BACK_DAYS)),
    newest: toLocalDateString(last),
  };
}

/** Whether the Note covers any day of `first`..`last` (inclusive). */
export function noteOverlaps(
  note: Note,
  first: LocalDateString,
  last: LocalDateString,
): boolean {
  return note.start <= last && note.end > first;
}

/** The Notes covering any day of `first`..`last` (inclusive), in order. */
export function notesOverlapping(
  notes: Note[],
  first: LocalDateString,
  last: LocalDateString,
): Note[] {
  return notes.filter(note => noteOverlaps(note, first, last));
}

/** The Notes covering `date`, in order. */
export function notesOn(notes: Note[], date: LocalDateString): Note[] {
  return notesOverlapping(notes, date, date);
}

/** The last day the Note covers (inclusive), the one every range displays. */
export function noteLastDay(note: Note): LocalDateString {
  return toLocalDateString(addDays(fromLocalDateString(note.end), -1));
}

/** Whether the Note covers more than one day. */
export function isMultiDay(note: Note): boolean {
  return noteLastDay(note) > note.start;
}
