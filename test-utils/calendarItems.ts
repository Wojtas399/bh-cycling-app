import { type IntervalsJson, fromIntervalsJson } from './intervalsJson';
import type {
  ActivityField,
  CalendarEventOptions,
  CalendarItem,
  CalendarRange,
  CalendarReads,
  RaceItem,
  UnplannedActivity,
} from '@/lib/calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '@/lib/intervalsApi';
import type { LocalDateTimeString } from '@/lib/localDateTime';
import type { Race } from '@/lib/races';
import { pick } from '@/lib/typed';
import type { CalendarWorkout } from '@/lib/workoutStatus';

type WorkoutItem = Extract<CalendarItem, { kind: 'workout' }>;
type ActivityItem = Extract<CalendarItem, { kind: 'activity' }>;
type UnplannedSharedActivity = Extract<UnplannedActivity, { name: string }>;
type UnplannedStravaActivity = Extract<
  UnplannedActivity,
  { isStravaActivity: true }
>;

export function unplannedActivity(
  overrides: Partial<UnplannedSharedActivity> = {},
): UnplannedSharedActivity {
  return {
    id: 'a1',
    date: '2026-11-14',
    name: 'Dojazd do pracy',
    type: 'Ride',
    ...overrides,
  };
}

export function unplannedStravaActivity(
  overrides: Partial<UnplannedStravaActivity> = {},
): UnplannedStravaActivity {
  return {
    id: 'a2',
    date: '2026-11-14',
    isStravaActivity: true,
    ...overrides,
  };
}

export function workoutItem(
  overrides: Partial<CalendarWorkout> = {},
): WorkoutItem {
  return {
    kind: 'workout',
    workout: {
      id: 1,
      name: 'Sweet spot',
      date: '2026-11-14',
      status: 'planned',
      blocks: [],
      completedWithStravaActivity: false,
      ...overrides,
    },
  };
}

export function activityItem(
  activity: UnplannedActivity = unplannedActivity(),
): ActivityItem {
  return { kind: 'activity', activity };
}

export function raceItem(
  overrides: Partial<Race> = {},
  pairedActivity?: UnplannedActivity,
): RaceItem {
  return {
    kind: 'race',
    race: {
      id: 7,
      name: 'Mazovia Maraton',
      priority: 'A',
      date: '2026-11-14',
      sport: 'Ride',
      ...overrides,
    },
    ...(pairedActivity && { activity: pairedActivity }),
  };
}

export function intervalsEvent(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-10-14T08:00:00',
    ...overrides,
  };
}

export function intervalsActivity(
  overrides: Partial<IntervalsJson<IntervalsActivity>> = {},
): IntervalsActivity {
  return fromIntervalsJson<IntervalsActivity>({
    id: 'a1',
    name: 'Zwift',
    type: 'VirtualRide',
    start_date_local: '2026-10-14T18:00:00',
    moving_time: 1620,
    distance: 14000,
    icu_training_load: 26,
    ...overrides,
  });
}

export interface FakeCalendarReads extends CalendarReads {
  eventReads: { range: CalendarRange; options: CalendarEventOptions }[];
  activityReads: { range: CalendarRange; fields: readonly ActivityField[] }[];
}

export function fakeCalendarReads({
  events = [],
  activities = [],
}: {
  events?: IntervalsCalendarEvent[];
  activities?: IntervalsActivity[];
} = {}): FakeCalendarReads {
  const eventReads: FakeCalendarReads['eventReads'] = [];
  const activityReads: FakeCalendarReads['activityReads'] = [];

  return {
    eventReads,
    activityReads,
    async events(range, options) {
      eventReads.push({ range, options });

      return events.filter(
        event =>
          startsWithin(event.start_date_local, range) &&
          isInCategory(event, options.category),
      );
    },
    async activities(range, fields) {
      activityReads.push({ range, fields });

      return activities
        .filter(activity => startsWithin(activity.start_date_local, range))
        .map(activity => pick(activity, fields));
    },
  };
}

function startsWithin(
  startDateLocal: LocalDateTimeString,
  { oldest, newest }: CalendarRange,
): boolean {
  const day = startDateLocal.slice(0, 10);

  return oldest <= day && day <= newest;
}

function isInCategory(
  event: IntervalsCalendarEvent,
  category: CalendarEventOptions['category'],
): boolean {
  if (category === undefined) return true;

  const categories: readonly string[] =
    typeof category === 'string' ? [category] : category;

  return categories.includes(event.category);
}
