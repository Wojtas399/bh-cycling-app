import type { LocalDateString } from './localDate';
import { type Note, noteLastDay } from './notes';

/** One Note's bar within a grid row: a run of adjacent cells. */
export interface NoteBarSegment {
  note: Note;
  /** 0 is the top lane. */
  lane: number;
  /** Columns in the row, 0 = Monday, inclusive. The label starts here. */
  firstColumn: number;
  lastColumn: number;
  /** True only where the bar holds the Note's real first day. */
  roundedStart: boolean;
  /** True only where the bar holds the Note's real last day. */
  roundedEnd: boolean;
}

export interface NoteRowLayout {
  /** The bars to draw, in the Notes' `id` order. */
  segments: NoteBarSegment[];
  /** "+N" per date: the Notes on the day that didn't fit a drawn lane. */
  overflowByDate: Record<LocalDateString, number>;
}

/** The month grid draws this many lanes; more Notes on a day show as "+N". */
export const NOTE_LANES = 2;

/**
 * Lays one month-grid row's Notes out as bars. `row` is the row's 7 dates,
 * Monday first; `monthDates` the month's own dates, as days of the
 * neighbouring months stay empty. `notes` must be in `id` order (as
 * `toNotes` gives them). Each Note overlapping the row, in that order, takes the lowest lane free across its whole span in the row; a Note
 * past the drawn lanes adds 1 to "+N" on each day it covers in the row.
 */
export function layoutNoteRow(
  row: readonly LocalDateString[],
  monthDates: readonly LocalDateString[],
  notes: readonly Note[],
): NoteRowLayout {
  const inMonth = new Set(monthDates);
  const segments: NoteBarSegment[] = [];
  const overflowByDate: Record<LocalDateString, number> = {};
  /** For each lane, which columns are taken. */
  const lanes: boolean[][] = [];

  for (const note of notes) {
    const columns = row
      .map((date, column) => ({ date, column }))
      .filter(
        ({ date }) =>
          inMonth.has(date) && note.start <= date && date < note.end,
      )
      .map(({ column }) => column);

    if (columns.length === 0) continue;

    const firstColumn = columns[0];
    const lastColumn = columns[columns.length - 1];
    let lane = lanes.findIndex(taken =>
      columns.every(column => !taken[column]),
    );

    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }

    for (const column of columns) {
      lanes[lane][column] = true;
    }

    if (lane >= NOTE_LANES) {
      for (const column of columns) {
        overflowByDate[row[column]] = (overflowByDate[row[column]] ?? 0) + 1;
      }

      continue;
    }

    segments.push({
      note,
      lane,
      firstColumn,
      lastColumn,
      roundedStart: row[firstColumn] === note.start,
      roundedEnd: row[lastColumn] === noteLastDay(note),
    });
  }

  return { segments, overflowByDate };
}
