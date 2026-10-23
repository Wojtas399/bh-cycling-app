import type { CalendarItemsByDate } from './calendarItems';
import { type CalendarData, eachDate } from './calendarWorkouts';
import { toLocalDateString } from './localDate';
import { type Note, notesOverlapping } from './notes';

/** The slice of one month's query result the Calendar combines. */
export interface MonthResult {
  data: CalendarData | undefined;
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

/** The visible range's months, shaped like a single query. */
export interface CombinedMonthResult {
  /** The range's items by day and Notes, once every month has data. */
  data: CalendarData | undefined;
  /** Some month has no data yet. */
  isPending: boolean;
  /** Some month failed with no data to fall back on. */
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

/**
 * A `useQueries` `combine` merging the month queries that cover `start..end`
 * into one result sliced to that range. A Note held by two months (a week
 * across a month's edge) is listed once, and only the Notes overlapping the
 * range are kept, in `id` order. A month that fails a refetch keeps its
 * data, so it counts as loaded rather than failed.
 */
export function combineMonthResults(
  start: Date,
  end: Date,
): (results: MonthResult[]) => CombinedMonthResult {
  return results => {
    const isPending = results.some(result => result.data === undefined);
    let data: CalendarData | undefined;

    if (!isPending) {
      const months = results.map(result => result.data as CalendarData);
      const merged: CalendarItemsByDate = Object.assign(
        {},
        ...months.map(month => month.itemsByDate),
      );
      const itemsByDate: CalendarItemsByDate = {};

      for (const date of eachDate(start, end)) {
        itemsByDate[date] = merged[date] ?? [];
      }

      const notesById = new Map<number, Note>();

      for (const month of months) {
        for (const note of month.notes) notesById.set(note.id, note);
      }

      const notes = notesOverlapping(
        [...notesById.values()].sort((a, b) => a.id - b.id),
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
