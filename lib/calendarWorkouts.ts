import {
  type CalendarItemsByDate,
  type StoredCalendarItem,
  calendarItemDate,
  joinCalendarItems,
  withWorkoutStatus,
} from './calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
  IntervalsField,
} from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  daysBetween,
  toLocalDateString,
} from './localDate';
import { type Note, notesOverlapping } from './notes';
import type { ZoneConfig } from './powerZones';

export const CALENDAR_ITEM_ACTIVITY_FIELDS: readonly IntervalsField<IntervalsActivity>[] =
  [
    'id',
    'start_date_local',
    'type',
    'paired_event_id',
    'name',
    'moving_time',
    'distance',
    'icu_training_load',
  ];

export const PAIRING_WINDOW_DAYS = 7;

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

export const MONDAY_BASED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type MondayBasedWeekday = (typeof MONDAY_BASED_WEEKDAYS)[number];

export function daysSinceMonday(date: Date): MondayBasedWeekday {
  return MONDAY_BASED_WEEKDAYS[(date.getDay() + 6) % 7];
}

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

export type YearMonth = string;

export function toYearMonth(date: Date): YearMonth {
  return toLocalDateString(date).slice(0, 7);
}

export function fromYearMonth(yearMonth: YearMonth): Date {
  const [year, month] = yearMonth.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

export function eachDate(oldest: Date, newest: Date): LocalDateString[] {
  const dayCount =
    daysBetween(toLocalDateString(oldest), toLocalDateString(newest)) + 1;

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

export interface StoredMonth {
  itemsByDate: Record<LocalDateString, StoredCalendarItem[]>;
  completedEventIds: number[];
  notes: Note[];
}

export interface CalendarData {
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
}

export function buildMonthItems(
  month: Date,
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  notes: Note[],
  zoneConfig: ZoneConfig,
): StoredMonth {
  const itemsByDate: StoredMonth['itemsByDate'] = {};
  const dates = eachDate(startOfMonth(month), endOfMonth(month));

  for (const date of dates) {
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

  return {
    itemsByDate,
    completedEventIds,
    notes: notesOverlapping(notes, dates[0], dates[dates.length - 1]),
  };
}

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
