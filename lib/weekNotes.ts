import type { LocalDateString } from './localDate';
import { type Note, isMultiDay, notesOn, notesOverlapping } from './notes';

export interface WeekDayNotes {
  /** The multi-day Notes covering the day, one left-edge stripe each. */
  stripes: Note[];
  /** The single-day Notes on the day, one chip each. */
  chips: Note[];
}

export interface WeekNotes {
  /** The multi-day Notes overlapping the week, one banner each. */
  banners: Note[];
  /** Per date of the week. */
  days: Record<LocalDateString, WeekDayNotes>;
}

/**
 * Which Notes the week view shows where, all in `id` order. `days` are the
 * week's dates, Monday to Sunday.
 */
export function weekNotes(notes: Note[], days: LocalDateString[]): WeekNotes {
  const overlapping = notesOverlapping(notes, days[0], days[days.length - 1]);

  return {
    banners: overlapping.filter(isMultiDay),
    days: Object.fromEntries(
      days.map(date => {
        const onDay = notesOn(overlapping, date);

        return [
          date,
          {
            stripes: onDay.filter(isMultiDay),
            chips: onDay.filter(note => !isMultiDay(note)),
          },
        ];
      }),
    ),
  };
}
