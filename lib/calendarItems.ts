import { rideSteps } from './cyclingWorkout';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { type LocalDateString, toSortedDatedWorkoutEvents } from './localDate';
import { pairWorkouts } from './pairing';
import { plannedDurationSeconds } from './plannedDuration';
import type { ZoneConfig } from './powerZones';
import { type Race, compareRaces, toRace } from './races';
import { isSharedActivity, isStravaActivity } from './stravaActivity';
import { buildWorkoutProfile } from './workoutProfile';
import {
  type CalendarWorkout,
  type StoredWorkout,
  workoutStatus,
} from './workoutStatus';

interface UnplannedActivityBase {
  id: string;
  /** Local calendar date the Activity was recorded on, `YYYY-MM-DD`. */
  date: LocalDateString;
  durationSeconds?: number;
  distanceMeters?: number;
  load?: number;
}

/**
 * An Activity paired to no Workout, per the `Unplanned Activity` glossary term
 * in CONTEXT.md. It has no Workout Status. Each metric is absent when
 * intervals.icu has none, zero included.
 *
 * A Strava Activity (see CONTEXT.md) is one intervals.icu can't share, so it
 * has no name or sport type, and `isStravaActivity` tells it apart.
 */
export type UnplannedActivity =
  | (UnplannedActivityBase & {
      isStravaActivity?: false;
      name: string;
      /** intervals.icu's sport type, e.g. `Ride`, `VirtualRide`, `Run`. */
      type: string;
    })
  | (UnplannedActivityBase & { isStravaActivity: true });

/** The recorded figures of the Activity paired to a Race. */
export type RaceActivity = Pick<
  UnplannedActivityBase,
  'id' | 'durationSeconds' | 'distanceMeters'
>;

/**
 * A Race on its day. It never gets a Workout Status: an unpaired Race is
 * never planned or missed, whatever its date.
 */
export interface RaceItem {
  kind: 'race';
  race: Race;
  /** The Activity paired to the Race, which completes it. */
  activity?: RaceActivity;
}

/** One entry of a day's list: a Workout, a Race or an Unplanned Activity. */
export type CalendarItem =
  | { kind: 'workout'; workout: CalendarWorkout }
  | RaceItem
  | { kind: 'activity'; activity: UnplannedActivity };

/** A day's entry as stored: a Workout's status depends on today. */
export type StoredCalendarItem =
  | { kind: 'workout'; workout: StoredWorkout }
  | RaceItem
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

/** An item with the `start_date_local` that orders it within its day. */
interface SortableItem {
  start: string;
  item: StoredCalendarItem;
}

/**
 * Joins calendar events against Activities with the pairing rule in
 * `pairWorkouts` (ADR 0009): a Workout and an Activity are paired when either
 * names the other. Primary-key matching only — never by date or type.
 *
 * A paired Workout and its Activities are one item on the earliest
 * Activity's day, as on Intervals.icu (ADR 0007). A Workout whose event names
 * an Activity outside `activities` is still completed, on its planned day.
 * Every other Activity is an Unplanned Activity — including one paired to a
 * Race, or to an event not among `events` (a Workout outside the fetched
 * window), so it still shows once rather than vanishing.
 *
 * Every Race among `events` is a Race item on its own day.
 *
 * Items come out day by day. Within a day, the Races lead in Race order (see
 * `compareRaces`); the Workouts and Activities follow by `start_date_local`,
 * Workouts first on ties.
 */
export function joinCalendarItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): JoinedCalendarItems {
  const workoutEvents = toSortedDatedWorkoutEvents(events);
  const { byEventId, pairedActivityIds, completedEventIds } = pairWorkouts(
    workoutEvents.map(({ event }) => event),
    activities,
  );

  const unplanned = activities
    .filter(activity => !pairedActivityIds.has(activity.id))
    .map(
      (activity): SortableItem => ({
        start: activity.start_date_local,
        item: { kind: 'activity', activity: toUnplannedActivity(activity) },
      }),
    );

  const workouts = workoutEvents.map(({ event, date }): SortableItem => {
    const paired = byEventId.get(event.id)?.activity;

    return {
      start: paired?.start_date_local ?? event.start_date_local,
      item: {
        kind: 'workout',
        workout: {
          id: event.id,
          name: event.name,
          date: paired ? toDate(paired.start_date_local) : date,
          durationSeconds: plannedDurationSeconds(event),
          blocks: buildWorkoutProfile(rideSteps(event), zoneConfig),
          completedWithStravaActivity:
            paired != null && isStravaActivity(paired),
        },
      },
    };
  });

  const races = events.flatMap((event): SortableItem[] => {
    const race = toRace(event);

    return race
      ? [{ start: event.start_date_local, item: { kind: 'race', race } }]
      : [];
  });

  // Stable, and Workouts go in before Activities, so they lead on a tie.
  const items = [...races, ...workouts, ...unplanned]
    .sort(compareItems)
    .map(({ item }) => item);

  return { items, completedEventIds: [...completedEventIds] };
}

/** Day by day; within a day, Races first in Race order, then by start. */
function compareItems(a: SortableItem, b: SortableItem): number {
  const byDay = calendarItemDate(a.item).localeCompare(
    calendarItemDate(b.item),
  );

  if (byDay !== 0) return byDay;

  if (a.item.kind === 'race') {
    return b.item.kind === 'race' ? compareRaces(a.item.race, b.item.race) : -1;
  }

  if (b.item.kind === 'race') return 1;

  return a.start.localeCompare(b.start);
}

function toDate(startDateLocal: string): LocalDateString {
  return startDateLocal.slice(0, 10);
}

/** The local date an item shows on, `YYYY-MM-DD`. */
export function calendarItemDate(item: StoredCalendarItem): LocalDateString {
  switch (item.kind) {
    case 'workout':
      return item.workout.date;
    case 'race':
      return item.race.date;
    case 'activity':
      return item.activity.date;
  }
}

/**
 * A key unique across a day's items: Workout, Race and Activity IDs may
 * collide.
 */
export function calendarItemKey(item: StoredCalendarItem): string {
  switch (item.kind) {
    case 'workout':
      return `workout-${item.workout.id}`;
    case 'race':
      return `race-${item.race.id}`;
    case 'activity':
      return `activity-${item.activity.id}`;
  }
}

function toUnplannedActivity(source: IntervalsActivity): UnplannedActivity {
  const activity: UnplannedActivityBase = {
    id: source.id,
    date: toDate(source.start_date_local),
    durationSeconds: positive(source.moving_time),
    distanceMeters: positive(source.distance),
    load: positive(source.icu_training_load),
  };

  return isSharedActivity(source)
    ? { ...activity, name: source.name, type: source.type }
    : { ...activity, isStravaActivity: true };
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
  if (item.kind !== 'workout') return item;

  return {
    kind: 'workout',
    workout: {
      ...item.workout,
      status: workoutStatus(item.workout, completedEventIds, today),
    },
  };
}

/** A metric an Unplanned Activity's tile can show. */
export interface ActivityMetric {
  metric: 'duration' | 'distance' | 'load';
  /** In s, m, or load points. */
  value: number;
}

/** The Activity's tile metrics, in display order, each only when present. */
export function activityMetrics({
  durationSeconds,
  distanceMeters,
  load,
}: UnplannedActivity): ActivityMetric[] {
  const metrics: [ActivityMetric['metric'], number | undefined][] = [
    ['duration', durationSeconds],
    ['distance', distanceMeters],
    ['load', load],
  ];

  return metrics.flatMap(([metric, value]) =>
    value === undefined ? [] : [{ metric, value }],
  );
}
