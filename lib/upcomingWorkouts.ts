import {
  type CalendarItem,
  calendarItemDate,
  calendarItemKey,
  joinCalendarItems,
  withWorkoutStatus,
} from './calendarItems';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import { type Note, notesOn } from './notes';
import type { ZoneConfig } from './powerZones';

export type UpcomingItem = (CalendarItem | { kind: 'note'; note: Note }) & {
  dayLabel: 'today' | 'tomorrow';
};

export function upcomingItemKey(item: UpcomingItem): string {
  return item.kind === 'note' ? `note-${item.note.id}` : calendarItemKey(item);
}

export function getUpcomingItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  notesInIdOrder: Note[],
  today: LocalDateString,
  zoneConfig: ZoneConfig,
): UpcomingItem[] {
  const tomorrow = toLocalDateString(addDays(fromLocalDateString(today), 1));
  const { items, completedEventIds } = joinCalendarItems(
    events,
    activities,
    zoneConfig,
  );
  const completed = new Set(completedEventIds);
  const todays: UpcomingItem[] = [];
  const tomorrows: UpcomingItem[] = [];

  for (const item of items) {
    const date = calendarItemDate(item);
    const withStatus = withWorkoutStatus(item, completed, today);

    if (date === today) todays.push({ ...withStatus, dayLabel: 'today' });

    if (date === tomorrow && item.kind !== 'activity') {
      tomorrows.push({ ...withStatus, dayLabel: 'tomorrow' });
    }
  }

  for (const note of notesOn(notesInIdOrder, today)) {
    todays.push({ kind: 'note', note, dayLabel: 'today' });
  }

  for (const note of notesInIdOrder) {
    if (note.start === tomorrow) {
      tomorrows.push({ kind: 'note', note, dayLabel: 'tomorrow' });
    }
  }

  return [...todays, ...tomorrows];
}
