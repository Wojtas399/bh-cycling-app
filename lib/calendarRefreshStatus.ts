import type { CombinedMonthResult } from './combineMonthResults';

export type CalendarRefreshStatus = 'idle' | 'refreshing' | 'disabled';

/**
 * Refresh is the only retry the Calendar's error state offers, so it stays
 * enabled after a failed load; disabling it whenever there's no data would
 * leave a failed range stuck until the athlete navigated away. Only a first
 * load still in flight disables it.
 */
export function calendarRefreshStatus(
  query: Pick<CombinedMonthResult, 'data' | 'isError'>,
  refreshing: boolean,
): CalendarRefreshStatus {
  if (!query.data && !query.isError) {
    return 'disabled';
  }

  return refreshing ? 'refreshing' : 'idle';
}
