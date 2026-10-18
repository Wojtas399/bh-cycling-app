import {
  type CalendarItem,
  calendarItemDate,
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
import type { ZoneConfig } from './powerZones';

/** An item on Home, labelled with the day it shows on. */
export type UpcomingItem = CalendarItem & { dayLabel: 'today' | 'tomorrow' };

/**
 * Home's items for `today` and the day after, in order: each Workout with its
 * Workout Status, on its Activity's day when paired, and today's Unplanned
 * Activities among them. Tomorrow holds only Workouts.
 */
export function getUpcomingItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
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

  return items.flatMap((item): UpcomingItem[] => {
    const date = calendarItemDate(item);
    const withStatus = withWorkoutStatus(item, completed, today);

    if (date === today) return [{ ...withStatus, dayLabel: 'today' }];

    if (date === tomorrow && item.kind === 'workout') {
      return [{ ...withStatus, dayLabel: 'tomorrow' }];
    }

    return [];
  });
}
