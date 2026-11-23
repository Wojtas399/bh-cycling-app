import { rideSteps } from './cyclingWorkout';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
  IntervalsCalendarEventsParams,
  IntervalsField,
} from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import {
  type LocalDateString,
  addDays,
  eachDate,
  fromLocalDateString,
  toLocalDateString,
  toSortedDatedWorkoutEvents,
} from './localDate';
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

export const PAIRING_WINDOW_DAYS = 7;

const PAIRING_ACTIVITY_FIELDS = [
  'id',
  'start_date_local',
  'type',
  'paired_event_id',
  'name',
] as const satisfies readonly IntervalsField<IntervalsActivity>[];

type PairingActivityField = (typeof PAIRING_ACTIVITY_FIELDS)[number];

export type ActivityField = IntervalsField<IntervalsActivity>;

export type PairedActivity<Field extends ActivityField> = Pick<
  IntervalsActivity,
  PairingActivityField | Field
>;

export const TILE_ACTIVITY_FIELDS = [
  'moving_time',
  'distance',
  'icu_training_load',
] as const satisfies readonly ActivityField[];

export type TileActivityField = (typeof TILE_ACTIVITY_FIELDS)[number];

export interface CalendarRange {
  oldest: LocalDateString;
  newest: LocalDateString;
}

export type CalendarEventOptions = Pick<
  IntervalsCalendarEventsParams,
  'category' | 'resolve'
>;

export interface CalendarReads {
  events(
    range: CalendarRange,
    options: CalendarEventOptions,
  ): Promise<IntervalsCalendarEvent[]>;
  activities<Field extends ActivityField>(
    range: CalendarRange,
    fields: readonly Field[],
  ): Promise<Pick<IntervalsActivity, Field>[]>;
}

export interface CalendarRangeReadOptions<Field extends ActivityField> {
  activityFields: readonly Field[];
  eventOptions?: CalendarEventOptions;
}

export interface PairedWorkout<Field extends ActivityField> {
  kind: 'workout';
  event: IntervalsCalendarEvent;
  activity: PairedActivity<Field> | null;
  completed: boolean;
}

export interface PairedRace<Field extends ActivityField> {
  kind: 'race';
  event: IntervalsCalendarEvent;
  race: Race;
  activity: PairedActivity<Field> | null;
}

export interface PairedUnplannedActivity<Field extends ActivityField> {
  kind: 'activity';
  activity: PairedActivity<Field>;
}

export type PairedCalendarItem<Field extends ActivityField> =
  | PairedWorkout<Field>
  | PairedRace<Field>
  | PairedUnplannedActivity<Field>;

export interface PairedCalendarRange<Field extends ActivityField> {
  items: PairedCalendarItem<Field>[];
  completedEventIds: number[];
}

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

export interface StoredCalendarItems {
  itemsByDate: Record<LocalDateString, StoredCalendarItem[]>;
  completedEventIds: number[];
}

export interface JoinedCalendarItems {
  items: StoredCalendarItem[];
  completedEventIds: number[];
}

interface SortableItem {
  startDateLocal: LocalDateTimeString;
  item: StoredCalendarItem;
}

export async function readCalendarRange<Field extends ActivityField>(
  reads: CalendarReads,
  range: CalendarRange,
  { activityFields, eventOptions = {} }: CalendarRangeReadOptions<Field>,
): Promise<PairedCalendarRange<Field>> {
  const padded = padByPairingWindow(range);
  const [events, activities] = await Promise.all([
    reads.events(padded, eventOptions),
    reads.activities(padded, [
      ...new Set([...PAIRING_ACTIVITY_FIELDS, ...activityFields]),
    ]),
  ]);

  return pairCalendarItems(events, activities);
}

export function findWorkout<Field extends ActivityField>(
  { items }: PairedCalendarRange<Field>,
  eventId: number,
): PairedWorkout<Field> | undefined {
  return items
    .filter(item => item.kind === 'workout')
    .find(({ event }) => event.id === eventId);
}

export function toStoredCalendarItems(
  { items, completedEventIds }: PairedCalendarRange<TileActivityField>,
  { oldest, newest }: CalendarRange,
  zoneConfig: ZoneConfig,
): StoredCalendarItems {
  const itemsByDate: StoredCalendarItems['itemsByDate'] = {};

  for (const date of eachDate(
    fromLocalDateString(oldest),
    fromLocalDateString(newest),
  )) {
    itemsByDate[date] = [];
  }

  for (const item of toSortedStoredItems(items, zoneConfig)) {
    itemsByDate[calendarItemDate(item)]?.push(item);
  }

  return { itemsByDate, completedEventIds };
}

export function joinCalendarItems(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): JoinedCalendarItems {
  const { items, completedEventIds } = pairCalendarItems<TileActivityField>(
    events,
    activities,
  );

  return { items: toSortedStoredItems(items, zoneConfig), completedEventIds };
}

function padByPairingWindow({ oldest, newest }: CalendarRange): CalendarRange {
  return {
    oldest: shiftDays(oldest, -PAIRING_WINDOW_DAYS),
    newest: shiftDays(newest, PAIRING_WINDOW_DAYS),
  };
}

function shiftDays(date: LocalDateString, days: number): LocalDateString {
  return toLocalDateString(addDays(fromLocalDateString(date), days));
}

function pairCalendarItems<Field extends ActivityField>(
  events: IntervalsCalendarEvent[],
  activities: readonly PairedActivity<Field>[],
): PairedCalendarRange<Field> {
  const workoutEvents = toSortedDatedWorkoutEvents(events).map(
    ({ event }) => event,
  );
  const raceEvents = events.flatMap(event => {
    const race = toRace(event);

    return race ? [{ event, race }] : [];
  });
  const { byEventId, pairedActivityIds, completedEventIds } = pairWorkouts(
    [...workoutEvents, ...raceEvents.map(({ event }) => event)],
    activities,
  );

  const races = raceEvents.map(
    ({ event, race }): PairedRace<Field> => ({
      kind: 'race',
      event,
      race,
      activity: byEventId.get(event.id)?.activity ?? null,
    }),
  );

  const workouts = workoutEvents.map((event): PairedWorkout<Field> => {
    const pairing = byEventId.get(event.id);

    return {
      kind: 'workout',
      event,
      activity: pairing?.activity ?? null,
      completed: pairing?.completed ?? false,
    };
  });

  const unplanned = activities
    .filter(activity => !pairedActivityIds.has(activity.id))
    .map(
      (activity): PairedUnplannedActivity<Field> => ({
        kind: 'activity',
        activity,
      }),
    );

  return {
    items: [...races, ...workouts, ...unplanned],
    completedEventIds: [...completedEventIds],
  };
}

function toSortedStoredItems(
  items: PairedCalendarItem<TileActivityField>[],
  zoneConfig: ZoneConfig,
): StoredCalendarItem[] {
  return items
    .map(item => toSortableItem(item, zoneConfig))
    .sort(compareItems)
    .map(({ item }) => item);
}

function toSortableItem(
  paired: PairedCalendarItem<TileActivityField>,
  zoneConfig: ZoneConfig,
): SortableItem {
  switch (paired.kind) {
    case 'workout': {
      const { event, activity } = paired;
      const startDateLocal =
        activity?.start_date_local ?? event.start_date_local;

      return {
        startDateLocal,
        item: {
          kind: 'workout',
          workout: {
            id: event.id,
            name: event.name,
            date: toDate(startDateLocal),
            durationSeconds: plannedDurationSeconds(event),
            blocks: buildWorkoutProfile(rideSteps(event), zoneConfig),
            completedWithStravaActivity:
              activity != null && isStravaActivity(activity),
          },
        },
      };
    }
    case 'race':
      return {
        startDateLocal: paired.event.start_date_local,
        item: {
          kind: 'race',
          race: paired.race,
          ...(paired.activity && {
            activity: toUnplannedActivity(paired.activity),
          }),
        },
      };
    case 'activity':
      return {
        startDateLocal: paired.activity.start_date_local,
        item: {
          kind: 'activity',
          activity: toUnplannedActivity(paired.activity),
        },
      };
  }
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

function toUnplannedActivity(
  source: PairedActivity<TileActivityField>,
): UnplannedActivity {
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

export function withItemStatuses(
  { itemsByDate, completedEventIds }: StoredCalendarItems,
  today: LocalDateString,
): CalendarItemsByDate {
  const completed = new Set(completedEventIds);
  const result: CalendarItemsByDate = {};

  for (const [date, items] of Object.entries(itemsByDate)) {
    result[date] = items.map(item => withWorkoutStatus(item, completed, today));
  }

  return result;
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
