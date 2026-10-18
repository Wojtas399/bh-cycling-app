import {
  activityMetrics,
  calendarItemDate,
  calendarItemKey,
  joinCalendarItems,
  withWorkoutStatus,
} from '../calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-10-14T08:00:00',
    ...overrides,
  };
}

function activity(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'a1',
    name: 'Zwift',
    type: 'VirtualRide',
    start_date_local: '2026-10-14T18:00:00',
    moving_time: 1620,
    distance: 14000,
    icu_training_load: 26,
    ...overrides,
  };
}

const ZONE_CONFIG = resolveZoneConfig();

describe('joinCalendarItems', () => {
  it('lists an Activity paired to no Workout as an Unplanned Activity', () => {
    const { items } = joinCalendarItems([], [activity({})], ZONE_CONFIG);

    expect(items).toEqual([
      {
        kind: 'activity',
        activity: {
          id: 'a1',
          name: 'Zwift',
          type: 'VirtualRide',
          date: '2026-10-14',
          durationSeconds: 1620,
          distanceMeters: 14000,
          load: 26,
        },
      },
    ]);
  });

  it('shows a paired Activity only as its Workout, moved to the Activity day', () => {
    const { items, completedEventIds } = joinCalendarItems(
      [
        event({
          id: 7,
          name: 'Threshold',
          start_date_local: '2026-10-15T08:00:00',
        }),
      ],
      [
        activity({
          paired_event_id: 7,
          start_date_local: '2026-10-14T18:00:00',
        }),
      ],
      ZONE_CONFIG,
    );

    expect(items).toEqual([
      {
        kind: 'workout',
        workout: { id: 7, name: 'Threshold', date: '2026-10-14', blocks: [] },
      },
    ]);
    expect(completedEventIds).toEqual([7]);
  });

  it('lists a day as one list by start time, Workouts first on a tie', () => {
    const { items } = joinCalendarItems(
      [
        event({
          id: 1,
          name: 'Evening',
          start_date_local: '2026-10-14T19:00:00',
        }),
        event({ id: 2, name: 'Tied', start_date_local: '2026-10-14T18:00:00' }),
      ],
      [
        activity({ id: 'tied', start_date_local: '2026-10-14T18:00:00' }),
        activity({ id: 'early', start_date_local: '2026-10-14T06:00:00' }),
      ],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemKey)).toEqual([
      'activity-early',
      'workout-2',
      'activity-tied',
      'workout-1',
    ]);
  });

  it('orders a moved Workout by its Activity start time', () => {
    const { items } = joinCalendarItems(
      [event({ id: 1, start_date_local: '2026-10-15T06:00:00' })],
      [
        activity({
          id: 'paired',
          paired_event_id: 1,
          start_date_local: '2026-10-14T20:00:00',
        }),
        activity({ id: 'zwift', start_date_local: '2026-10-14T12:00:00' }),
      ],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemKey)).toEqual(['activity-zwift', 'workout-1']);
  });

  it('moves a Workout to the earliest of several paired Activities and lists none of them', () => {
    const { items } = joinCalendarItems(
      [event({ id: 1, start_date_local: '2026-10-15T08:00:00' })],
      [
        activity({
          id: 'later',
          paired_event_id: 1,
          start_date_local: '2026-10-16T08:00:00',
        }),
        activity({
          id: 'earlier',
          paired_event_id: 1,
          start_date_local: '2026-10-14T08:00:00',
        }),
      ],
      ZONE_CONFIG,
    );

    expect(items).toHaveLength(1);
    expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
  });

  it('keeps a Workout with no paired Activity on its planned day', () => {
    const { items } = joinCalendarItems(
      [event({ id: 1, start_date_local: '2026-10-15T08:00:00' })],
      [activity({ paired_event_id: 99 })],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemDate)).toEqual(['2026-10-14', '2026-10-15']);
  });

  it('lists an Activity paired to an event it was not given, so it never vanishes', () => {
    const { items, completedEventIds } = joinCalendarItems(
      [event({ id: 3, category: 'RACE_A' })],
      [activity({ id: 'race', paired_event_id: 3 })],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemKey)).toEqual(['activity-race']);
    expect(completedEventIds).toEqual([3]);
  });

  it('drops an Activity metric that is missing or zero', () => {
    const { items } = joinCalendarItems(
      [],
      [activity({ moving_time: 0, distance: 0, icu_training_load: undefined })],
      ZONE_CONFIG,
    );

    expect(items).toEqual([
      {
        kind: 'activity',
        activity: {
          id: 'a1',
          name: 'Zwift',
          type: 'VirtualRide',
          date: '2026-10-14',
        },
      },
    ]);
  });

  it('excludes non-WORKOUT events', () => {
    const { items } = joinCalendarItems(
      [
        event({ id: 1, category: 'RACE', name: 'Race day' }),
        event({ id: 2, category: 'NOTE', name: 'Note' }),
        event({ id: 3, name: 'Intervals' }),
      ],
      [],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemKey)).toEqual(['workout-3']);
  });

  it('does not match an Activity to a Workout by date or type alone', () => {
    const { items, completedEventIds } = joinCalendarItems(
      [event({ id: 1 })],
      [activity({ start_date_local: '2026-10-14T08:00:00' })],
      ZONE_CONFIG,
    );

    expect(items.map(calendarItemKey)).toEqual(['workout-1', 'activity-a1']);
    expect(completedEventIds).toEqual([]);
  });

  it('attaches the planned duration and the profile built against the zone config', () => {
    const { items } = joinCalendarItems(
      [
        event({
          workout_doc: {
            duration: 3600,
            steps: [
              { duration: 3600, power: { units: 'power_zone', value: 2 } },
            ],
          },
        }),
      ],
      [],
      resolveZoneConfig({ powerZones: [60, 80, 95] }),
    );

    expect(items[0]).toMatchObject({
      workout: {
        durationSeconds: 3600,
        blocks: [{ widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 }],
      },
    });
  });

  it('returns nothing when there are no events or Activities', () => {
    expect(joinCalendarItems([], [], ZONE_CONFIG)).toEqual({
      items: [],
      completedEventIds: [],
    });
  });
});

describe('withWorkoutStatus', () => {
  const TODAY = '2026-10-14';

  it("derives a Workout's status as of today", () => {
    const item = {
      kind: 'workout' as const,
      workout: { id: 1, name: 'Ride', date: '2026-10-13', blocks: [] },
    };

    expect(withWorkoutStatus(item, new Set(), TODAY)).toMatchObject({
      workout: { status: 'missed' },
    });
    expect(withWorkoutStatus(item, new Set([1]), TODAY)).toMatchObject({
      workout: { status: 'completed' },
    });
  });

  it('gives an Unplanned Activity no status', () => {
    const item = {
      kind: 'activity' as const,
      activity: { id: 'a1', name: 'Zwift', type: 'Ride', date: '2026-10-13' },
    };

    expect(withWorkoutStatus(item, new Set(), TODAY)).toEqual(item);
  });
});

describe('activityMetrics', () => {
  it('lists duration, distance and load in that order', () => {
    expect(
      activityMetrics({
        id: 'a1',
        name: 'Zwift',
        type: 'VirtualRide',
        date: '2026-10-14',
        load: 26,
        distanceMeters: 14000,
        durationSeconds: 1620,
      }),
    ).toEqual([
      { metric: 'duration', value: 1620 },
      { metric: 'distance', value: 14000 },
      { metric: 'load', value: 26 },
    ]);
  });

  it('leaves out the metrics the Activity has none of', () => {
    expect(
      activityMetrics({
        id: 'a1',
        name: 'Gym',
        type: 'WeightTraining',
        date: '2026-10-14',
        durationSeconds: 2700,
      }),
    ).toEqual([{ metric: 'duration', value: 2700 }]);
  });
});
