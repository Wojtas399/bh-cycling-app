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

/** An item on Home, labelled with the day it shows on. */
export type UpcomingItem = (CalendarItem | { kind: 'note'; note: Note }) & {
  dayLabel: 'today' | 'tomorrow';
};

/** A key unique across Home's items. */
export function upcomingItemKey(item: UpcomingItem): string {
  return item.kind === 'note' ? `note-${item.note.id}` : calendarItemKey(item);
}

/**
 * Home's items for `today` and the day after, in order: each Workout with its
 * Workout Status, on its Activity's day when paired, and today's Unplanned
 * Activities among them; then that day's Notes, in `id` order. Tomorrow holds
 * only Workouts and Notes. A Note shows once: under today if it covers today,
 * else under tomorrow if it starts then.
 */
export function getUpcomingItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  notes: Note[],
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

    if (date === tomorrow && item.kind === 'workout') {
      tomorrows.push({ ...withStatus, dayLabel: 'tomorrow' });
    }
  }

  const byId = [...notes].sort((a, b) => a.id - b.id);

  for (const note of notesOn(byId, today)) {
    todays.push({ kind: 'note', note, dayLabel: 'today' });
  }

  for (const note of byId) {
    if (note.start === tomorrow) {
      tomorrows.push({ kind: 'note', note, dayLabel: 'tomorrow' });
    }
  }

  return [...todays, ...tomorrows];
}
