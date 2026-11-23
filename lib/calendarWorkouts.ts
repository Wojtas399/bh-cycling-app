import type { CalendarItemsByDate, StoredCalendarItems } from './calendarItems';
import type { Note } from './notes';

export interface StoredMonth extends StoredCalendarItems {
  notes: Note[];
}

export interface CalendarData {
  itemsByDate: CalendarItemsByDate;
  notes: Note[];
}
