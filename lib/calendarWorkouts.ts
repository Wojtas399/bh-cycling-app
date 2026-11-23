import {
  type CalendarItemsByDate,
  PAIRING_WINDOW_DAYS,
  type StoredCalendarItems,
} from './calendarItems';
import { type LocalDateString, addDays, toLocalDateString } from './localDate';
import type { Note } from './notes';

export function pairingWindow(
  first: Date,
  last: Date,
): { oldest: LocalDateString; newest: LocalDateString } {
  return {
    oldest: toLocalDateString(addDays(first, -PAIRING_WINDOW_DAYS)),
    newest: toLocalDateString(addDays(last, PAIRING_WINDOW_DAYS)),
  };
}

export interface StoredMonth extends StoredCalendarItems {
  notes: Note[];
}

export interface CalendarData {
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
}
