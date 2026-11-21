import type { CalendarItemsByDate } from './calendarItems';
import { type CalendarData, eachDate } from './calendarWorkouts';
import { toLocalDateString } from './localDate';
import { type Note, byNoteId, notesOverlapping } from './notes';

export interface MonthResult {
  data: CalendarData | undefined;
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

export interface CombinedMonthResult {
  data: CalendarData | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

export function combineMonthResults(
  start: Date,
  end: Date,
): (results: MonthResult[]) => CombinedMonthResult {
  return results => {
    const months = results
      .map(result => result.data)
      .filter(month => month !== undefined);
    const isPending = months.length < results.length;
    let data: CalendarData | undefined;

    if (!isPending) {
      const merged: CalendarItemsByDate = Object.assign(
        {},
        ...months.map(month => month.itemsByDate),
      );
      const itemsByDate: CalendarItemsByDate = {};

      for (const date of eachDate(start, end)) {
        itemsByDate[date] = merged[date] ?? [];
      }

      const notes = notesOverlapping(
        eachNoteOnceInIdOrder(months),
        toLocalDateString(start),
        toLocalDateString(end),
      );

      data = { itemsByDate, notes };
    }

    return {
      data,
      isPending,
      isError: results.some(
        result => result.isError && result.data === undefined,
      ),
      isFetching: results.some(result => result.isFetching),
      isRefetching: results.some(result => result.isRefetching),
    };
  };
}

function eachNoteOnceInIdOrder(months: CalendarData[]): Note[] {
  const notesById = new Map<number, Note>();

  for (const month of months) {
    for (const note of month.notes) notesById.set(note.id, note);
  }

  return [...notesById.values()].sort(byNoteId);
}
