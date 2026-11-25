import {
  type LocalDateString,
  MONDAY_BASED_WEEKDAYS,
  type MondayBasedWeekday,
} from './localDate';
import { type Note, noteLastDay, noteOverlaps } from './notes';

export type LaneFromTop = number;

export interface NoteBarSegment {
  note: Note;
  lane: LaneFromTop;
  firstColumn: MondayBasedWeekday;
  lastColumn: MondayBasedWeekday;
  roundedStart: boolean;
  roundedEnd: boolean;
}

export interface NoteRowLayout {
  segments: NoteBarSegment[];
  overflowByDate: Record<LocalDateString, number>;
}

export const NOTE_LANES = 2;

export function layoutNoteRow(
  rowDatesFromMonday: readonly LocalDateString[],
  monthDates: readonly LocalDateString[],
  notesInIdOrder: readonly Note[],
): NoteRowLayout {
  const inMonth = new Set(monthDates);
  const segments: NoteBarSegment[] = [];
  const overflowByDate: Record<LocalDateString, number> = {};
  const takenColumnsByLane: boolean[][] = [];

  for (const note of notesInIdOrder) {
    const columns = MONDAY_BASED_WEEKDAYS.filter(column => {
      const date = rowDatesFromMonday[column];

      return inMonth.has(date) && noteOverlaps(note, date, date);
    });

    if (columns.length === 0) continue;

    const firstColumn = columns[0];
    const lastColumn = columns[columns.length - 1];
    let lane = takenColumnsByLane.findIndex(taken =>
      columns.every(column => !taken[column]),
    );

    if (lane === -1) {
      lane = takenColumnsByLane.length;
      takenColumnsByLane.push([]);
    }

    for (const column of columns) {
      takenColumnsByLane[lane][column] = true;
    }

    if (lane >= NOTE_LANES) {
      for (const column of columns) {
        const date = rowDatesFromMonday[column];

        overflowByDate[date] = (overflowByDate[date] ?? 0) + 1;
      }

      continue;
    }

    segments.push({
      note,
      lane,
      firstColumn,
      lastColumn,
      roundedStart: rowDatesFromMonday[firstColumn] === note.start,
      roundedEnd: rowDatesFromMonday[lastColumn] === noteLastDay(note),
    });
  }

  return { segments, overflowByDate };
}
