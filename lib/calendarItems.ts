import { rideSteps } from './cyclingWorkout';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { type LocalDateString, toSortedDatedWorkoutEvents } from './localDate';
import type { LocalDateTimeString } from './localDateTime';
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
  date: LocalDateString;
  durationSeconds?: number;
  distanceMeters?: number;
  load?: number;
}

export type UnplannedActivity =
  | (UnplannedActivityBase & {
      isStravaActivity?: false;
      name: string;
      type: string;
    })
  | (UnplannedActivityBase & { isStravaActivity: true });

export interface RaceItem {
  kind: 'race';
  race: Race;
  activity?: UnplannedActivity;
}

export type CalendarItem =
  | { kind: 'workout'; workout: CalendarWorkout }
  | RaceItem
  | { kind: 'activity'; activity: UnplannedActivity };

export type StoredCalendarItem =
  | { kind: 'workout'; workout: StoredWorkout }
  | RaceItem
  | { kind: 'activity'; activity: UnplannedActivity };

export type CalendarItemsByDate = Record<LocalDateString, CalendarItem[]>;

export interface JoinedCalendarItems {
  items: StoredCalendarItem[];
  completedEventIds: number[];
}

interface SortableItem {
  startDateLocal: LocalDateTimeString;
  item: StoredCalendarItem;
}

export function joinCalendarItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): JoinedCalendarItems {
  const workoutEvents = toSortedDatedWorkoutEvents(events);
  const raceEvents = events.flatMap(event => {
    const race = toRace(event);

    return race ? [{ event, race }] : [];
  });
  const { byEventId, pairedActivityIds, completedEventIds } = pairWorkouts(
    [...workoutEvents, ...raceEvents].map(({ event }) => event),
    activities,
  );

  const unplanned = activities
    .filter(activity => !pairedActivityIds.has(activity.id))
    .map(
      (activity): SortableItem => ({
        startDateLocal: activity.start_date_local,
        item: { kind: 'activity', activity: toUnplannedActivity(activity) },
      }),
    );

  const workouts = workoutEvents.map(({ event, date }): SortableItem => {
    const paired = byEventId.get(event.id)?.activity;

    return {
      startDateLocal: paired?.start_date_local ?? event.start_date_local,
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

  const races = raceEvents.map(({ event, race }): SortableItem => {
    const paired = byEventId.get(event.id)?.activity;

    return {
      startDateLocal: event.start_date_local,
      item: {
        kind: 'race',
        race,
        ...(paired && { activity: toUnplannedActivity(paired) }),
      },
    };
  });

  const items = [...races, ...workouts, ...unplanned]
    .sort(compareItems)
    .map(({ item }) => item);

  return { items, completedEventIds: [...completedEventIds] };
}

const WORKOUT_BEFORE_ACTIVITY_AT_SAME_START = { workout: 0, activity: 1 };

function compareItems(a: SortableItem, b: SortableItem): number {
  const byDay = calendarItemDate(a.item).localeCompare(
    calendarItemDate(b.item),
  );

  if (byDay !== 0) return byDay;

  if (a.item.kind === 'race') {
    return b.item.kind === 'race' ? compareRaces(a.item.race, b.item.race) : -1;
  }

  if (b.item.kind === 'race') return 1;

  return (
    a.startDateLocal.localeCompare(b.startDateLocal) ||
    WORKOUT_BEFORE_ACTIVITY_AT_SAME_START[a.item.kind] -
      WORKOUT_BEFORE_ACTIVITY_AT_SAME_START[b.item.kind]
  );
}

function toDate(startDateLocal: LocalDateTimeString): LocalDateString {
  return startDateLocal.slice(0, 10);
}

export function calendarItemDate(item: StoredCalendarItem): LocalDateString {
  switch (item.kind) {
    case 'workout':
      return item.workout.date;
    case 'race':
      return item.activity?.date ?? item.race.date;
    case 'activity':
      return item.activity.date;
  }
}

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
    durationSeconds: positiveOrUndefined(source.moving_time),
    distanceMeters: positiveOrUndefined(source.distance),
    load: positiveOrUndefined(source.icu_training_load),
  };

  return isSharedActivity(source)
    ? { ...activity, name: source.name, type: source.type }
    : { ...activity, isStravaActivity: true };
}

function positiveOrUndefined(value: number | undefined): number | undefined {
  return isFiniteNumber(value) && value > 0 ? value : undefined;
}

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

export interface ActivityMetric {
  metric: 'duration' | 'distance' | 'load';
  value: number;
}

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
