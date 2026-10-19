import type { CalendarItemsByDate } from './calendarItems';
import { eachDate } from './calendarWorkouts';

/** The slice of one month's query result the Calendar combines. */
export interface MonthResult {
  data: CalendarItemsByDate | undefined;
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

/** The visible range's months, shaped like a single query. */
export interface CombinedMonthResult {
  /** The range's items by day, once every month has data. */
  data: CalendarItemsByDate | undefined;
  /** Some month has no data yet. */
  isPending: boolean;
  /** Some month failed with no data to fall back on. */
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
}

/**
 * A `useQueries` `combine` merging the month queries that cover `start..end`
 * into one result sliced to that range. A month that fails a refetch keeps
 * its data, so it counts as loaded rather than failed.
 */
export function combineMonthResults(
  start: Date,
  end: Date,
): (results: MonthResult[]) => CombinedMonthResult {
  return results => {
    const isPending = results.some(result => result.data === undefined);
    let data: CalendarItemsByDate | undefined;

    if (!isPending) {
      const merged: CalendarItemsByDate = Object.assign(
        {},
        ...results.map(result => result.data),
      );

      data = {};

      for (const date of eachDate(start, end)) {
        data[date] = merged[date] ?? [];
      }
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
