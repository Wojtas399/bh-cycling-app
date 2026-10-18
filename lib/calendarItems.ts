import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { type LocalDateString, toSortedDatedWorkoutEvents } from './localDate';
import { plannedDurationSeconds } from './plannedDuration';
import type { ZoneConfig } from './powerZones';
import { buildWorkoutProfile } from './workoutProfile';
import {
  type CalendarWorkout,
  type StoredWorkout,
  workoutStatus,
} from './workoutStatus';

/**
 * An Activity paired to no Workout, per the `Unplanned Activity` glossary term
 * in CONTEXT.md. It has no Workout Status. Each metric is absent when
 * intervals.icu has none, zero included.
 */
export interface UnplannedActivity {
  id: string;
  name: string;
  /** intervals.icu's sport type, e.g. `Ride`, `VirtualRide`, `Run`. */
  type: string;
  /** Local calendar date the Activity was recorded on, `YYYY-MM-DD`. */
  date: LocalDateString;
  durationSeconds?: number;
  distanceMeters?: number;
  load?: number;
}

/** One entry of a day's list: a Workout or an Unplanned Activity. */
export type CalendarItem =
  | { kind: 'workout'; workout: CalendarWorkout }
  | { kind: 'activity'; activity: UnplannedActivity };

/** A day's entry as stored: a Workout's status depends on today. */
export type StoredCalendarItem =
  | { kind: 'workout'; workout: StoredWorkout }
  | { kind: 'activity'; activity: UnplannedActivity };

/** Items by local `YYYY-MM-DD`; a day with none maps to `[]`. */
export type CalendarItemsByDate = Record<string, CalendarItem[]>;

/**
 * The items without a Workout Status, plus the IDs of the events an Activity
 * is paired to — plain arrays, so they stay JSON.
 */
export interface JoinedCalendarItems {
  items: StoredCalendarItem[];
  completedEventIds: number[];
}

/** An item with what orders it within its day. */
interface SortableItem {
  start: string;
  item: StoredCalendarItem;
}

/**
 * Joins calendar events against Activities on the `paired_event_id` link
 * intervals.icu sets when an Activity fulfils a planned event. Primary-key
 * matching only — an Activity lacking the pairing field is never matched by
 * date/type fallback, an accepted v1 gap.
 *
 * A paired Workout and its Activity are one item on the Activity's day, as on
 * Intervals.icu; with several Activities paired, the earliest sets the day.
 * Every other Activity is an Unplanned Activity — including one paired to an
 * event not among `events` (a race, or a Workout outside the fetched window),
 * so it still shows once rather than vanishing.
 *
 * Items come out chronological by `start_date_local`, Workouts first on ties.
 */
export function joinCalendarItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): JoinedCalendarItems {
  const completedEventIds = [
    ...new Set(
      activities
        .map(activity => activity.paired_event_id)
        .filter((id): id is number => typeof id === 'number'),
    ),
  ];

  const workoutEvents = toSortedDatedWorkoutEvents(events);
  const workoutIds = new Set(workoutEvents.map(({ event }) => event.id));
  const pairedActivities = new Map<number, IntervalsActivity>();
  const unplanned: SortableItem[] = [];

  for (const activity of [...activities].sort(byStart)) {
    const eventId = activity.paired_event_id;

    if (eventId === undefined || !workoutIds.has(eventId)) {
      unplanned.push({
        start: activity.start_date_local,
        item: { kind: 'activity', activity: toUnplannedActivity(activity) },
      });
    } else if (!pairedActivities.has(eventId)) {
      pairedActivities.set(eventId, activity);
    }
  }

  const workouts = workoutEvents.map(({ event, date }): SortableItem => {
    const paired = pairedActivities.get(event.id);

    return {
      start: paired?.start_date_local ?? event.start_date_local,
      item: {
        kind: 'workout',
        workout: {
          id: event.id,
          name: event.name,
          date: paired ? toDate(paired.start_date_local) : date,
          durationSeconds: plannedDurationSeconds(event),
          blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
        },
      },
    };
  });

  // Stable, and Workouts go in first, so they lead on a tie.
  const items = [...workouts, ...unplanned]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(({ item }) => item);

  return { items, completedEventIds };
}

function byStart(a: IntervalsActivity, b: IntervalsActivity): number {
  return a.start_date_local.localeCompare(b.start_date_local);
}

function toDate(startDateLocal: string): LocalDateString {
  return startDateLocal.slice(0, 10);
}

/** The local date an item shows on, `YYYY-MM-DD`. */
export function calendarItemDate(item: StoredCalendarItem): LocalDateString {
  return item.kind === 'workout' ? item.workout.date : item.activity.date;
}

/** A key unique across a day's items: Workout and Activity IDs may collide. */
export function calendarItemKey(item: StoredCalendarItem): string {
  return item.kind === 'workout'
    ? `workout-${item.workout.id}`
    : `activity-${item.activity.id}`;
}

function toUnplannedActivity({
  id,
  name,
  type,
  start_date_local,
  moving_time,
  distance,
  icu_training_load,
}: IntervalsActivity): UnplannedActivity {
  return {
    id,
    name,
    type,
    date: toDate(start_date_local),
    durationSeconds: positive(moving_time),
    distanceMeters: positive(distance),
    load: positive(icu_training_load),
  };
}

function positive(value: number | undefined): number | undefined {
  return isFiniteNumber(value) && value > 0 ? value : undefined;
}

/** Gives a stored item its Workout Status as of `today`, when it is a Workout. */
export function withWorkoutStatus(
  item: StoredCalendarItem,
  completedEventIds: ReadonlySet<number>,
  today: LocalDateString,
): CalendarItem {
  if (item.kind === 'activity') return item;

  return {
    kind: 'workout',
    workout: {
      ...item.workout,
      status: workoutStatus(item.workout, completedEventIds, today),
    },
  };
}
