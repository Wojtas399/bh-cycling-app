import {
  EVENT_CATEGORY,
  type HexColorString,
  type IntervalsCalendarEvent,
} from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import { stripNoteHtml } from './stripNoteHtml';

export type ExclusiveEndDate = LocalDateString;

export interface Note {
  id: number;
  name: string | null;
  description: string | null;
  color: HexColorString | null;
  start: LocalDateString;
  end: ExclusiveEndDate;
}

function textOrNull(value: string | null | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

function nextDay(date: LocalDateString): ExclusiveEndDate {
  return toLocalDateString(addDays(fromLocalDateString(date), 1));
}

export type NoteEvent = Omit<IntervalsCalendarEvent, 'name' | 'description'> & {
  name?: string | null;
  description?: string | null;
};

export function byNoteId(a: Note, b: Note): number {
  return a.id - b.id;
}

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

export const NOTE_LOOK_BACK_DAYS = 31;

export function noteWindow(
  first: Date,
  last: Date,
): { oldest: LocalDateString; newest: LocalDateString } {
  return {
    oldest: toLocalDateString(addDays(first, -NOTE_LOOK_BACK_DAYS)),
    newest: toLocalDateString(last),
  };
}

export function noteOverlaps(
  note: Note,
  first: LocalDateString,
  last: LocalDateString,
): boolean {
  return note.start <= last && note.end > first;
}

export function notesOverlapping(
  notes: Note[],
  first: LocalDateString,
  last: LocalDateString,
): Note[] {
  return notes.filter(note => noteOverlaps(note, first, last));
}

export function notesOn(notes: Note[], date: LocalDateString): Note[] {
  return notesOverlapping(notes, date, date);
}

export function noteLastDay(note: Note): LocalDateString {
  return toLocalDateString(addDays(fromLocalDateString(note.end), -1));
}

export function isMultiDay(note: Note): boolean {
  return noteLastDay(note) > note.start;
}

export function noteText(note: Note): string {
  return note.description ? stripNoteHtml(note.description).trim() : '';
}
