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
        workout: {
          id: 7,
          name: 'Threshold',
          date: '2026-10-14',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
    ]);
    expect(completedEventIds).toEqual([7]);
  });

  describe('pairing read from both sides (ADR 0009)', () => {
    // Shaped like #184: intervals.icu blanks a Strava Activity's own
    // `paired_event_id` but keeps the event's `paired_activity_id`.
    const stravaActivity = (
      overrides: Partial<IntervalsActivity> = {},
    ): IntervalsActivity =>
      activity({
        id: '20664018356',
        name: undefined,
        type: undefined,
        start_date_local: '2026-10-20T15:05:00',
        moving_time: 0,
        distance: 0,
        icu_training_load: undefined,
        ...overrides,
      });

    it('completes a Workout whose event names a Strava Activity, on that Activity day, flagged as completed with it, and lists no Unplanned Activity', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [
          event({
            id: 142141194,
            name: 'Siłownia adaptacja 2',
            start_date_local: '2026-10-21T00:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        [stravaActivity()],
        ZONE_CONFIG,
      );

      expect(items).toEqual([
        {
          kind: 'workout',
          workout: {
            id: 142141194,
            name: 'Siłownia adaptacja 2',
            date: '2026-10-20',
            blocks: [],
            completedWithStravaActivity: true,
          },
        },
      ]);
      expect(completedEventIds).toEqual([142141194]);
    });

    it('completes a Workout an Activity names when the event names none', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [event({ id: 7, start_date_local: '2026-10-15T08:00:00' })],
        [
          activity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T18:00:00',
          }),
        ],
        ZONE_CONFIG,
      );

      expect(items.map(calendarItemKey)).toEqual(['workout-7']);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
      expect(completedEventIds).toEqual([7]);
    });

    it('shows a native pairing recorded on both sides as one Workout, not flagged as completed with a Strava Activity', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: 'i1001',
          }),
        ],
        [
          activity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T18:00:00',
          }),
        ],
        ZONE_CONFIG,
      );

      expect(items).toEqual([
        {
          kind: 'workout',
          workout: {
            id: 7,
            name: 'Sample workout',
            date: '2026-10-14',
            blocks: [],
            completedWithStravaActivity: false,
          },
        },
      ]);
      expect(completedEventIds).toEqual([7]);
    });

    it('completes a Workout whose named Activity is outside the range, on its planned day, not flagged', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        [activity({ id: 'i2002', start_date_local: '2026-10-15T18:00:00' })],
        ZONE_CONFIG,
      );

      expect(items.map(calendarItemKey)).toEqual([
        'workout-7',
        'activity-i2002',
      ]);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-15', '2026-10-15']);
      expect(items[0]).toMatchObject({
        workout: { completedWithStravaActivity: false },
      });
      expect(completedEventIds).toEqual([7]);
    });

    it('moves a Workout to the earliest Activity paired from either side, which decides the flag, and lists none of them', () => {
      const { items } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        [
          activity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-16T08:00:00',
          }),
          stravaActivity({ start_date_local: '2026-10-14T15:05:00' }),
        ],
        ZONE_CONFIG,
      );

      expect(items.map(calendarItemKey)).toEqual(['workout-7']);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
      expect(items[0]).toMatchObject({
        workout: { completedWithStravaActivity: true },
      });
    });

    it('does not flag a Workout whose earliest paired Activity is native, though a later one is a Strava Activity', () => {
      const { items } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        [
          activity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T08:00:00',
          }),
          stravaActivity({ start_date_local: '2026-10-16T15:05:00' }),
        ],
        ZONE_CONFIG,
      );

      expect(items).toEqual([
        {
          kind: 'workout',
          workout: expect.objectContaining({
            date: '2026-10-14',
            completedWithStravaActivity: false,
          }),
        },
      ]);
    });

    it('lists a Strava Activity no event names as an Unplanned Strava Activity', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-20T08:00:00',
            paired_activity_id: 'i1001',
          }),
        ],
        [stravaActivity()],
        ZONE_CONFIG,
      );

      expect(items).toEqual([
        {
          kind: 'workout',
          workout: {
            id: 7,
            name: 'Sample workout',
            date: '2026-10-20',
            blocks: [],
            completedWithStravaActivity: false,
          },
        },
        {
          kind: 'activity',
          activity: {
            id: '20664018356',
            isStravaActivity: true,
            date: '2026-10-20',
          },
        },
      ]);
      expect(completedEventIds).toEqual([7]);
    });

    it('lists an Activity naming an event outside those given, alongside an event-side pairing', () => {
      const { items, completedEventIds } = joinCalendarItems(
        [
          event({
            id: 7,
            start_date_local: '2026-10-20T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        [
          stravaActivity(),
          activity({
            id: 'i3003',
            paired_event_id: 99,
            start_date_local: '2026-10-21T08:00:00',
          }),
        ],
        ZONE_CONFIG,
      );

      expect(items.map(calendarItemKey)).toEqual([
        'workout-7',
        'activity-i3003',
      ]);
      expect([...completedEventIds].sort((a, b) => a - b)).toEqual([7, 99]);
    });
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

  it('lists an Activity with no type or name, paired from neither side, as a Strava Activity on its day', () => {
    const { items, completedEventIds } = joinCalendarItems(
      [event({ id: 1, start_date_local: '2026-10-14T08:00:00' })],
      [
        activity({
          id: '20679555658',
          name: undefined,
          type: undefined,
          start_date_local: '2026-10-14T18:00:00',
        }),
      ],
      ZONE_CONFIG,
    );

    expect(items).toEqual([
      {
        kind: 'workout',
        workout: {
          id: 1,
          name: 'Sample workout',
          date: '2026-10-14',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
      {
        kind: 'activity',
        activity: {
          id: '20679555658',
          isStravaActivity: true,
          date: '2026-10-14',
          durationSeconds: 1620,
          distanceMeters: 14000,
          load: 26,
        },
      },
    ]);
    expect(completedEventIds).toEqual([]);
  });

  it.each([
    ['type', { type: undefined }],
    ['name', { name: undefined }],
    ['type (null)', { type: null as unknown as undefined }],
    ['name (null)', { name: null as unknown as undefined }],
  ])(
    'lists an Activity missing only its %s as a Strava Activity',
    (_field, overrides) => {
      const { items } = joinCalendarItems(
        [],
        [activity(overrides)],
        ZONE_CONFIG,
      );

      expect(items).toEqual([
        {
          kind: 'activity',
          activity: expect.objectContaining({ isStravaActivity: true }),
        },
      ]);
    },
  );

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
      workout: {
        id: 1,
        name: 'Ride',
        date: '2026-10-13',
        blocks: [],
        completedWithStravaActivity: false,
      },
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
