import type { LocalDateString } from './localDate';
import {
  type Note,
  isMultiDay,
  noteLastDay,
  noteOverlaps,
  notesOn,
  notesOverlapping,
} from './notes';

export type LaneFromScreenEdge = number;

export interface NoteLane {
  note: Note;
  lane: LaneFromScreenEdge;
}

export interface LaneCrossing extends NoteLane {
  starts: boolean;
  ends: boolean;
}

export interface NoteRow {
  note: Note;
  multiDay: boolean;
}

export interface WeekDayNotes {
  crossings: LaneCrossing[];
  rows: NoteRow[];
  hiddenCount: number;
}

export interface WeekNotes {
  lanes: NoteLane[];
  days: Record<LocalDateString, WeekDayNotes>;
}

export const MAX_NOTE_ROWS = 2;

export function weekNotes(
  notesInIdOrder: Note[],
  weekDatesFromMonday: LocalDateString[],
): WeekNotes {
  const monday = weekDatesFromMonday[0];
  const overlapping = notesOverlapping(
    notesInIdOrder,
    monday,
    weekDatesFromMonday[weekDatesFromMonday.length - 1],
  );
  const lanes = overlapping
    .filter(isMultiDay)
    .map((note, lane): NoteLane => ({ note, lane }));

  return {
    lanes,
    days: Object.fromEntries(
      weekDatesFromMonday.map(date => {
        const crossings = lanes
          .filter(({ note }) => noteOverlaps(note, date, date))
          .map(
            (lane): LaneCrossing => ({
              ...lane,
              starts: lane.note.start === date,
              ends: noteLastDay(lane.note) === date,
            }),
          );
        const rows = [
          ...crossings
            .filter(({ starts }) => starts || date === monday)
            .map(({ note }): NoteRow => ({ note, multiDay: true })),
          ...notesOn(overlapping, date)
            .filter(note => !isMultiDay(note))
            .map((note): NoteRow => ({ note, multiDay: false })),
        ];

        return [
          date,
          {
            crossings,
            rows: rows.slice(0, MAX_NOTE_ROWS),
            hiddenCount: Math.max(rows.length - MAX_NOTE_ROWS, 0),
          },
        ];
      }),
    ),
  };
}
