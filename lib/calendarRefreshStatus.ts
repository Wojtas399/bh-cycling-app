import type { CombinedMonthResult } from './combineMonthResults';

export type CalendarRefreshStatus = 'idle' | 'refreshing' | 'disabled';

export function calendarRefreshStatus(
  query: Pick<CombinedMonthResult, 'data' | 'isError'>,
  refreshing: boolean,
): CalendarRefreshStatus {
  if (!query.data && !query.isError) {
    return 'disabled';
  }

  return refreshing ? 'refreshing' : 'idle';
}
