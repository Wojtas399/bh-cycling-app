import {
  type CalendarItemsByDate,
  type StoredCalendarItem,
  calendarItemDate,
  joinCalendarItems,
  withWorkoutStatus,
} from './calendarItems';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { type LocalDateString, addDays, toLocalDateString } from './localDate';
import type { ZoneConfig } from './powerZones';

/**
 * The Activity fields Home and the Calendar need: the pairing link to join
 * against events, and what an Unplanned Activity's tile shows. A slim
 * projection, not the full Activity payload Workout Details reads.
 */
export const ACTIVITY_FIELDS =
  'id,start_date_local,type,paired_event_id,name,moving_time,distance,icu_training_load';

/**
 * An Activity can be paired to an event scheduled on a different day (ridden
 * a day late, or a Thursday session done early on Wednesday), and the two
 * show as one item on the Activity's day. So both queries reach this many
 * days past each edge of the range: Activities, or a workout planned on a
 * range's first or last day would read as `missed`/`planned` despite being
 * completed just outside it; and events, or a Workout planned just outside
 * the range but ridden inside it would be missing. Activities are a slim
 * field projection, so the extra days are cheap.
 */
export const PAIRING_WINDOW_DAYS = 7;

/** The `oldest`/`newest` to fetch for `first..last`, a pairing window wider. */
export function pairingWindow(
  first: Date,
  last: Date,
): { oldest: LocalDateString; newest: LocalDateString } {
  return {
    oldest: toLocalDateString(addDays(first, -PAIRING_WINDOW_DAYS)),
    newest: toLocalDateString(addDays(last, PAIRING_WINDOW_DAYS)),
  };
}

export function startOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function endOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
}

/** The weekday in a Monday-first week: 0 for Monday through 6 for Sunday. */
export function daysSinceMonday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Local midnight of the week's Monday — the anchor's time of day is dropped. */
export function startOfWeek(anchor: Date): Date {
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - daysSinceMonday(anchor),
  );
}

export function endOfWeek(anchor: Date): Date {
  const monday = startOfWeek(anchor);

  return new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
}

/** A local calendar month, `YYYY-MM` — a Calendar month's cache key. */
export type YearMonth = string;

/** The local month the date falls in. */
export function toYearMonth(date: Date): YearMonth {
  return toLocalDateString(date).slice(0, 7);
}

/** Local midnight of the first day of the month. */
export function fromYearMonth(yearMonth: YearMonth): Date {
  const [year, month] = yearMonth.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

/**
 * Every local calendar date from `oldest` to `newest`, inclusive. Counts and
 * builds days from the calendar fields rather than stepping a timestamp, so a
 * DST shift or an anchor's time of day can never drop or duplicate a day.
 */
export function eachDate(oldest: Date, newest: Date): string[] {
  const dayCount =
    Math.round(
      (Date.UTC(newest.getFullYear(), newest.getMonth(), newest.getDate()) -
        Date.UTC(oldest.getFullYear(), oldest.getMonth(), oldest.getDate())) /
        86_400_000,
    ) + 1;

  return Array.from({ length: Math.max(dayCount, 0) }, (_, index) =>
    toLocalDateString(
      new Date(
        oldest.getFullYear(),
        oldest.getMonth(),
        oldest.getDate() + index,
      ),
    ),
  );
}

/**
 * What a month query stores: every day of the month with its items, no
 * Workout holding a status yet, and the IDs of the events completed by an
 * Activity. The status depends on today, so it's derived when read.
 */
export interface StoredMonth {
  itemsByDate: Record<string, StoredCalendarItem[]>;
  completedEventIds: number[];
}

/**
 * The month's items by day, every day of the month present. Items whose day
 * falls outside it — fetched only for the pairing window — are dropped.
 */
export function buildMonthItems(
  month: Date,
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): StoredMonth {
  const itemsByDate: StoredMonth['itemsByDate'] = {};

  for (const date of eachDate(startOfMonth(month), endOfMonth(month))) {
    itemsByDate[date] = [];
  }

  const { items, completedEventIds } = joinCalendarItems(
    events,
    activities,
    zoneConfig,
  );

  for (const item of items) {
    itemsByDate[calendarItemDate(item)]?.push(item);
  }

  return { itemsByDate, completedEventIds };
}

/** Gives every stored Workout its Workout Status as of `today`. */
export function withItemStatuses(
  { itemsByDate, completedEventIds }: StoredMonth,
  today: LocalDateString,
): CalendarItemsByDate {
  const completed = new Set(completedEventIds);
  const result: CalendarItemsByDate = {};

  for (const [date, items] of Object.entries(itemsByDate)) {
    result[date] = items.map(item => withWorkoutStatus(item, completed, today));
  }

  return result;
}
