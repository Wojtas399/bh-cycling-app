import type { LocalDateString } from './localDate';
import {
  type Note,
  isMultiDay,
  noteLastDay,
  noteOverlaps,
  notesOn,
  notesOverlapping,
} from './notes';

/** A multi-day Note's line beside the rail, in the same lane all week. */
export interface NoteLane {
  note: Note;
  /** 0 is the lane nearest the screen edge. */
  lane: number;
}

/** A lane's line across one day. */
export interface LaneCrossing extends NoteLane {
  /** The Note's real first day, so the line starts here. */
  starts: boolean;
  /** The Note's real last day, so the line ends here. */
  ends: boolean;
}

/** One Note row in a day's list. */
export interface NoteRow {
  note: Note;
  multiDay: boolean;
}

export interface WeekDayNotes {
  /** The lanes whose lines cross the day, in lane order. */
  crossings: LaneCrossing[];
  /** The Note rows the day shows, in screen order. */
  rows: NoteRow[];
  /** The day's Note rows past the cap, shown as "+N notatki". */
  hiddenCount: number;
}

export interface WeekNotes {
  /** Every multi-day Note overlapping the week, one lane each. */
  lanes: NoteLane[];
  /** Per date of the week. */
  days: Record<LocalDateString, WeekDayNotes>;
}

/** The Note rows a day shows before "+N notatki". */
export const MAX_NOTE_ROWS = 2;

/**
 * Where the week view's date rail draws the Notes. `notes` are in `id` order
 * (see `toNotes`), and `days` are the week's dates, Monday to Sunday.
 *
 * Every multi-day Note overlapping the week gets a lane of its own, in `id`
 * order, and keeps it all week even where a lower lane is free. Its title
 * row is on its first day in the week: its start, or Monday when it's
 * carried in. A day lists those rows, then its single-day Notes, cut to
 * `MAX_NOTE_ROWS`.
 */
export function weekNotes(notes: Note[], days: LocalDateString[]): WeekNotes {
  const monday = days[0];
  const overlapping = notesOverlapping(notes, monday, days[days.length - 1]);
  const lanes = overlapping
    .filter(isMultiDay)
    .map((note, lane): NoteLane => ({ note, lane }));

  return {
    lanes,
    days: Object.fromEntries(
      days.map(date => {
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
