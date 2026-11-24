import {
  type CalendarRange,
  type StoredCalendarItems,
  TILE_ACTIVITY_FIELDS,
  activityMetrics,
  calendarItemDate,
  calendarItemKey,
  findWorkout,
  readCalendarRange,
  toStoredCalendarItems,
  withItemStatuses,
} from '../calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { type ZoneConfig, resolveZoneConfig } from '../powerZones';
import {
  fakeCalendarReads,
  intervalsActivity,
  intervalsEvent,
} from '@/test-utils/calendarItems';

const ZONE_CONFIG = resolveZoneConfig();

const TWO_OCTOBER_WEEKS: CalendarRange = {
  oldest: '2026-10-12',
  newest: '2026-10-25',
};

interface Fixtures {
  events?: IntervalsCalendarEvent[];
  activities?: IntervalsActivity[];
  range?: CalendarRange;
  zoneConfig?: ZoneConfig;
}

async function storedItems({
  events,
  activities,
  range = TWO_OCTOBER_WEEKS,
  zoneConfig = ZONE_CONFIG,
}: Fixtures = {}): Promise<StoredCalendarItems> {
  const paired = await readCalendarRange(
    fakeCalendarReads({ events, activities }),
    range,
    { activityFields: TILE_ACTIVITY_FIELDS },
  );

  return toStoredCalendarItems(paired, range, zoneConfig);
}

async function listedItems(fixtures: Fixtures) {
  const { itemsByDate, completedEventIds } = await storedItems(fixtures);

  return { items: Object.values(itemsByDate).flat(), completedEventIds };
}

describe('readCalendarRange', () => {
  it("reads events and Activities a week past each edge of the range, adding the pairing fields to the caller's fields", async () => {
    const reads = fakeCalendarReads();

    await readCalendarRange(reads, TWO_OCTOBER_WEEKS, {
      activityFields: ['moving_time', 'name', 'icu_average_watts'],
    });

    expect(reads.eventReads).toEqual([
      { range: { oldest: '2026-10-05', newest: '2026-11-01' }, options: {} },
    ]);
    expect(reads.activityReads).toEqual([
      {
        range: { oldest: '2026-10-05', newest: '2026-11-01' },
        fields: [
          'id',
          'start_date_local',
          'type',
          'paired_event_id',
          'name',
          'moving_time',
          'icu_average_watts',
        ],
      },
    ]);
  });

  it('pads across month edges by calendar days', async () => {
    const reads = fakeCalendarReads();

    await readCalendarRange(
      reads,
      { oldest: '2026-10-01', newest: '2026-10-31' },
      { activityFields: [] },
    );

    expect(reads.eventReads[0].range).toEqual({
      oldest: '2026-09-24',
      newest: '2026-11-07',
    });
  });

  it("reads events with the caller's category and resolve options", async () => {
    const reads = fakeCalendarReads();

    await readCalendarRange(reads, TWO_OCTOBER_WEEKS, {
      activityFields: [],
      eventOptions: { category: 'WORKOUT', resolve: true },
    });

    expect(reads.eventReads[0].options).toEqual({
      category: 'WORKOUT',
      resolve: true,
    });
  });

  it("keeps a Workout ridden outside the range in the untrimmed read, with its raw event and the caller's fields on its Activity", async () => {
    const plannedInRange = intervalsEvent({
      id: 7,
      start_date_local: '2026-10-25T08:00:00',
    });
    const { items, completedEventIds } = await readCalendarRange(
      fakeCalendarReads({
        events: [plannedInRange],
        activities: [
          intervalsActivity({
            id: 'late',
            paired_event_id: 7,
            start_date_local: '2026-10-27T08:00:00',
            icu_average_watts: 212,
          }),
        ],
      }),
      TWO_OCTOBER_WEEKS,
      { activityFields: ['icu_average_watts'] },
    );

    expect(items).toEqual([
      {
        kind: 'workout',
        event: plannedInRange,
        activity: {
          id: 'late',
          start_date_local: '2026-10-27T08:00:00',
          type: 'VirtualRide',
          paired_event_id: 7,
          name: 'Zwift',
          icu_average_watts: 212,
        },
        completed: true,
      },
    ]);
    expect(completedEventIds).toEqual([7]);
  });
  it('types the paired Activity to the fields asked for, and returns no other', async () => {
    const { items } = await readCalendarRange(
      fakeCalendarReads({
        activities: [intervalsActivity({ icu_average_watts: 212 })],
      }),
      TWO_OCTOBER_WEEKS,
      { activityFields: ['moving_time'] },
    );
    const [unplanned] = items;

    expect(
      unplanned.kind === 'activity' && unplanned.activity.moving_time,
    ).toBe(1620);
    expect(
      unplanned.kind === 'activity' &&
        // @ts-expect-error: a field the caller did not ask for must not compile
        unplanned.activity.icu_average_watts,
    ).toBeUndefined();
  });
});

describe('toStoredCalendarItems', () => {
  it('lists an Activity paired to no Workout as an Unplanned Activity on its day, with every day of the range present', async () => {
    const { itemsByDate, completedEventIds } = await storedItems({
      activities: [intervalsActivity()],
      range: { oldest: '2026-10-13', newest: '2026-10-15' },
    });

    expect(itemsByDate).toEqual({
      '2026-10-13': [],
      '2026-10-14': [
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
      ],
      '2026-10-15': [],
    });
    expect(completedEventIds).toEqual([]);
  });

  it('shows a paired Activity only as its Workout, moved to the Activity day', async () => {
    const { items, completedEventIds } = await listedItems({
      events: [
        intervalsEvent({
          id: 7,
          name: 'Threshold',
          start_date_local: '2026-10-15T08:00:00',
        }),
      ],
      activities: [
        intervalsActivity({
          paired_event_id: 7,
          start_date_local: '2026-10-14T18:00:00',
        }),
      ],
    });

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

  describe('the pairing window (ADR 0007)', () => {
    it("places a Workout planned in the week after the range, ridden inside it, on its Activity's day", async () => {
      const { itemsByDate } = await storedItems({
        events: [
          intervalsEvent({ id: 7, start_date_local: '2026-11-01T08:00:00' }),
        ],
        activities: [
          intervalsActivity({
            paired_event_id: 7,
            start_date_local: '2026-10-25T18:00:00',
          }),
        ],
      });

      expect(itemsByDate['2026-10-25']).toMatchObject([
        { kind: 'workout', workout: { id: 7, date: '2026-10-25' } },
      ]);
    });

    it("places a Workout planned in the week before the range on its Activity's day inside it", async () => {
      const { itemsByDate } = await storedItems({
        events: [
          intervalsEvent({ id: 7, start_date_local: '2026-10-05T08:00:00' }),
        ],
        activities: [
          intervalsActivity({
            paired_event_id: 7,
            start_date_local: '2026-10-12T18:00:00',
          }),
        ],
      });

      expect(itemsByDate['2026-10-12']).toMatchObject([
        { kind: 'workout', workout: { id: 7 } },
      ]);
    });

    it('drops the items whose day falls outside the range, a Workout ridden after it and Unplanned Activities in the padding among them', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({ id: 7, start_date_local: '2026-10-25T08:00:00' }),
          intervalsEvent({ id: 8, start_date_local: '2026-10-20T08:00:00' }),
        ],
        activities: [
          intervalsActivity({
            id: 'late',
            paired_event_id: 7,
            start_date_local: '2026-10-26T08:00:00',
          }),
          intervalsActivity({
            id: 'before',
            start_date_local: '2026-10-11T08:00:00',
          }),
          intervalsActivity({
            id: 'after',
            start_date_local: '2026-10-26T18:00:00',
          }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual(['workout-8']);
      expect(completedEventIds).toEqual([7]);
    });

    it('completes a Workout planned in the padding and ridden inside the range, though its day has passed', async () => {
      const stored = await storedItems({
        events: [
          intervalsEvent({ id: 7, start_date_local: '2026-10-28T08:00:00' }),
        ],
        activities: [
          intervalsActivity({
            paired_event_id: 7,
            start_date_local: '2026-10-25T18:00:00',
          }),
        ],
      });

      expect(
        withItemStatuses(stored, '2026-10-30')['2026-10-25'],
      ).toMatchObject([{ workout: { id: 7, status: 'completed' } }]);
    });
  });

  describe("pairing read from both sides, as intervals.icu blanks a Strava Activity's own paired_event_id but keeps the event's paired_activity_id (ADR 0009)", () => {
    const stravaActivity = (
      overrides: Partial<IntervalsActivity> = {},
    ): IntervalsActivity =>
      intervalsActivity({
        id: '20664018356',
        name: undefined,
        type: undefined,
        start_date_local: '2026-10-20T15:05:00',
        moving_time: 0,
        distance: 0,
        icu_training_load: undefined,
        ...overrides,
      });

    it('completes a Workout whose event names a Strava Activity, on that Activity day, flagged as completed with it, and lists no Unplanned Activity', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 142141194,
            name: 'Siłownia adaptacja 2',
            start_date_local: '2026-10-21T00:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        activities: [stravaActivity()],
      });

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

    it('completes a Workout an Activity names when the event names none', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({ id: 7, start_date_local: '2026-10-15T08:00:00' }),
        ],
        activities: [
          intervalsActivity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T18:00:00',
          }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual(['workout-7']);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
      expect(completedEventIds).toEqual([7]);
    });

    it('shows a native pairing recorded on both sides as one Workout, not flagged as completed with a Strava Activity', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: 'i1001',
          }),
        ],
        activities: [
          intervalsActivity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T18:00:00',
          }),
        ],
      });

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

    it('completes a Workout whose named Activity is beyond the pairing window, on its planned day, not flagged', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        activities: [
          stravaActivity({ start_date_local: '2026-11-20T15:05:00' }),
          intervalsActivity({
            id: 'i2002',
            start_date_local: '2026-10-15T18:00:00',
          }),
        ],
      });

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

    it('moves a Workout to the earliest Activity paired from either side, which decides the flag, and lists none of them', async () => {
      const { items } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        activities: [
          intervalsActivity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-16T08:00:00',
          }),
          stravaActivity({ start_date_local: '2026-10-14T15:05:00' }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual(['workout-7']);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
      expect(items[0]).toMatchObject({
        workout: { completedWithStravaActivity: true },
      });
    });

    it('does not flag a Workout whose earliest paired Activity is native, though a later one is a Strava Activity', async () => {
      const { items } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        activities: [
          intervalsActivity({
            id: 'i1001',
            paired_event_id: 7,
            start_date_local: '2026-10-14T08:00:00',
          }),
          stravaActivity({ start_date_local: '2026-10-16T15:05:00' }),
        ],
      });

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

    it('lists a Strava Activity no event names as an Unplanned Strava Activity', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-20T08:00:00',
            paired_activity_id: 'i1001',
          }),
        ],
        activities: [stravaActivity()],
      });

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

    it('lists an Activity naming an event it did not read, alongside an event-side pairing', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-20T08:00:00',
            paired_activity_id: '20664018356',
          }),
        ],
        activities: [
          stravaActivity(),
          intervalsActivity({
            id: 'i3003',
            paired_event_id: 99,
            start_date_local: '2026-10-21T08:00:00',
          }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual([
        'workout-7',
        'activity-i3003',
      ]);
      expect([...completedEventIds].sort((a, b) => a - b)).toEqual([7, 99]);
    });

    it('treats an empty paired_activity_id as naming no Activity', async () => {
      const { items, completedEventIds } = await listedItems({
        events: [
          intervalsEvent({
            id: 7,
            start_date_local: '2026-10-15T08:00:00',
            paired_activity_id: '',
          }),
        ],
        activities: [
          intervalsActivity({
            id: '',
            start_date_local: '2026-10-15T18:00:00',
          }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual(['workout-7', 'activity-']);
      expect(completedEventIds).toEqual([]);
    });
  });

  it('lists a day as one list by start time, Workouts first on a tie', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({
          id: 1,
          name: 'Evening',
          start_date_local: '2026-10-14T19:00:00',
        }),
        intervalsEvent({
          id: 2,
          name: 'Tied',
          start_date_local: '2026-10-14T18:00:00',
        }),
      ],
      activities: [
        intervalsActivity({
          id: 'tied',
          start_date_local: '2026-10-14T18:00:00',
        }),
        intervalsActivity({
          id: 'early',
          start_date_local: '2026-10-14T06:00:00',
        }),
      ],
    });

    expect(items.map(calendarItemKey)).toEqual([
      'activity-early',
      'workout-2',
      'activity-tied',
      'workout-1',
    ]);
  });

  it('orders a moved Workout by its Activity start time', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-15T06:00:00' }),
      ],
      activities: [
        intervalsActivity({
          id: 'paired',
          paired_event_id: 1,
          start_date_local: '2026-10-14T20:00:00',
        }),
        intervalsActivity({
          id: 'zwift',
          start_date_local: '2026-10-14T12:00:00',
        }),
      ],
    });

    expect(items.map(calendarItemKey)).toEqual(['activity-zwift', 'workout-1']);
  });

  it('moves a Workout to the earliest of several paired Activities and lists none of them', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-15T08:00:00' }),
      ],
      activities: [
        intervalsActivity({
          id: 'later',
          paired_event_id: 1,
          start_date_local: '2026-10-16T08:00:00',
        }),
        intervalsActivity({
          id: 'earlier',
          paired_event_id: 1,
          start_date_local: '2026-10-14T08:00:00',
        }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
  });

  it('keeps a Workout with no paired Activity on its planned day', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-15T08:00:00' }),
      ],
      activities: [intervalsActivity({ paired_event_id: 99 })],
    });

    expect(items.map(calendarItemDate)).toEqual(['2026-10-14', '2026-10-15']);
  });

  it('lists an Activity paired to an event it did not read, so it never vanishes', async () => {
    const { items, completedEventIds } = await listedItems({
      activities: [intervalsActivity({ id: 'outside', paired_event_id: 3 })],
    });

    expect(items.map(calendarItemKey)).toEqual(['activity-outside']);
    expect(completedEventIds).toEqual([3]);
  });

  describe('Races', () => {
    it('lists a Race as a race item on its day', async () => {
      const { items } = await listedItems({
        events: [
          intervalsEvent({
            id: 3,
            category: 'RACE_A',
            name: 'Mistrzostwa Polski',
            start_date_local: '2026-10-14T00:00:00',
            type: 'Run',
          }),
        ],
      });

      expect(items).toEqual([
        {
          kind: 'race',
          race: {
            id: 3,
            name: 'Mistrzostwa Polski',
            priority: 'A',
            date: '2026-10-14',
            sport: 'Run',
          },
        },
      ]);
      expect(items.map(calendarItemKey)).toEqual(['race-3']);
      expect(items.map(calendarItemDate)).toEqual(['2026-10-14']);
    });

    it("lists a day's Races first, in Race order, then its Workouts and Activities by start time", async () => {
      const { items } = await listedItems({
        events: [
          intervalsEvent({ id: 1, start_date_local: '2026-10-14T06:00:00' }),
          intervalsEvent({
            id: 2,
            category: 'RACE_C',
            start_date_local: '2026-10-14T09:00:00',
          }),
          intervalsEvent({
            id: 3,
            category: 'RACE_B',
            start_date_local: '2026-10-14T17:00:00',
          }),
          intervalsEvent({
            id: 4,
            category: 'RACE_B',
            start_date_local: '2026-10-14T10:00:00',
          }),
          intervalsEvent({
            id: 5,
            category: 'RACE_A',
            start_date_local: '2026-10-15T00:00:00',
          }),
          intervalsEvent({ id: 6, start_date_local: '2026-10-15T07:00:00' }),
        ],
        activities: [
          intervalsActivity({
            id: 'early',
            start_date_local: '2026-10-14T05:00:00',
          }),
        ],
      });

      expect(items.map(calendarItemKey)).toEqual([
        'race-4',
        'race-3',
        'race-2',
        'activity-early',
        'workout-1',
        'race-5',
        'workout-6',
      ]);
    });

    describe('paired from the Activity side (ADR 0009)', () => {
      const race = (overrides: Partial<IntervalsCalendarEvent> = {}) =>
        intervalsEvent({
          id: 3,
          category: 'RACE_B',
          name: 'Gravel Race',
          type: 'Ride',
          start_date_local: '2026-10-14T09:00:00',
          moving_time: 10800,
          distance: 80000,
          ...overrides,
        });

      it('makes an Activity naming a Race part of the Race item, with its recorded figures, and lists no Unplanned Activity', async () => {
        const { items } = await listedItems({
          events: [race()],
          activities: [
            intervalsActivity({
              id: 'raced',
              paired_event_id: 3,
              start_date_local: '2026-10-14T09:02:00',
              moving_time: 9876,
              distance: 81234,
            }),
          ],
        });

        expect(items).toEqual([
          {
            kind: 'race',
            race: {
              id: 3,
              name: 'Gravel Race',
              priority: 'B',
              date: '2026-10-14',
              startTime: '09:00',
              sport: 'Ride',
              durationSeconds: 10800,
              distanceMeters: 80000,
            },
            activity: {
              id: 'raced',
              name: 'Zwift',
              type: 'VirtualRide',
              date: '2026-10-14',
              durationSeconds: 9876,
              distanceMeters: 81234,
              load: 26,
            },
          },
        ]);
      });

      it("shows a paired Race on its earliest Activity's day, still first on that day", async () => {
        const { items } = await listedItems({
          events: [
            race({ start_date_local: '2026-10-15T00:00:00' }),
            intervalsEvent({ id: 1, start_date_local: '2026-10-14T06:00:00' }),
          ],
          activities: [
            intervalsActivity({
              id: 'later',
              paired_event_id: 3,
              start_date_local: '2026-10-16T08:00:00',
            }),
            intervalsActivity({
              id: 'earlier',
              paired_event_id: 3,
              start_date_local: '2026-10-14T08:00:00',
            }),
          ],
        });

        expect(
          items.map(item => [calendarItemKey(item), calendarItemDate(item)]),
        ).toEqual([
          ['race-3', '2026-10-14'],
          ['workout-1', '2026-10-14'],
        ]);
        expect(items[0]).toMatchObject({
          race: { date: '2026-10-15' },
          activity: { id: 'earlier' },
        });
      });

      it('keeps a Strava Activity on the Race day a separate Unplanned Activity, as its paired_event_id is always null', async () => {
        const { items } = await listedItems({
          events: [race()],
          activities: [
            intervalsActivity({
              id: '20664018356',
              name: undefined,
              type: undefined,
              start_date_local: '2026-10-14T09:02:00',
            }),
          ],
        });

        expect(items.map(calendarItemKey)).toEqual([
          'race-3',
          'activity-20664018356',
        ]);
        expect(items[0]).not.toHaveProperty('activity');
      });
    });
  });

  it('lists an Activity with no type or name, paired from neither side, as a Strava Activity on its day', async () => {
    const { items, completedEventIds } = await listedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-14T08:00:00' }),
      ],
      activities: [
        intervalsActivity({
          id: '20679555658',
          name: undefined,
          type: undefined,
          start_date_local: '2026-10-14T18:00:00',
        }),
      ],
    });

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
    ['type (null)', { type: null }],
    ['name (null)', { name: null }],
  ])(
    'lists an Activity missing only its %s as a Strava Activity',
    async (_field, overrides) => {
      const { items } = await listedItems({
        activities: [intervalsActivity(overrides)],
      });

      expect(items).toEqual([
        {
          kind: 'activity',
          activity: expect.objectContaining({ isStravaActivity: true }),
        },
      ]);
    },
  );

  it('drops an Activity metric that is missing or zero', async () => {
    const { items } = await listedItems({
      activities: [
        intervalsActivity({
          moving_time: 0,
          distance: 0,
          icu_training_load: undefined,
        }),
      ],
    });

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

  it('lists Workouts and Races, not other events', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({ id: 1, category: 'RACE', name: 'Race day' }),
        intervalsEvent({ id: 2, category: 'NOTE', name: 'Note' }),
        intervalsEvent({ id: 3, name: 'Intervals' }),
      ],
    });

    expect(items.map(calendarItemKey)).toEqual(['workout-3']);
  });

  it('does not match an Activity to a Workout by date or type alone', async () => {
    const { items, completedEventIds } = await listedItems({
      events: [intervalsEvent({ id: 1 })],
      activities: [
        intervalsActivity({ start_date_local: '2026-10-14T08:00:00' }),
      ],
    });

    expect(items.map(calendarItemKey)).toEqual(['workout-1', 'activity-a1']);
    expect(completedEventIds).toEqual([]);
  });

  it('attaches the planned duration and the profile built against the zone config', async () => {
    const { items } = await listedItems({
      events: [
        intervalsEvent({
          workout_doc: {
            duration: 3600,
            steps: [
              { duration: 3600, power: { units: 'power_zone', value: 2 } },
            ],
          },
        }),
      ],
      zoneConfig: resolveZoneConfig({ powerZones: [60, 80, 95] }),
    });

    expect(items[0]).toMatchObject({
      workout: {
        durationSeconds: 3600,
        blocks: [{ widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 }],
      },
    });
  });

  it('draws a ride profile but none for a non-cycling Workout', async () => {
    const workoutDoc = {
      duration: 3600,
      steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
    };
    const { items } = await listedItems({
      events: [
        intervalsEvent({ id: 1, type: 'Ride', workout_doc: workoutDoc }),
        intervalsEvent({
          id: 2,
          type: 'WeightTraining',
          workout_doc: workoutDoc,
        }),
      ],
      zoneConfig: resolveZoneConfig({ powerZones: [60, 80, 95] }),
    });

    expect(items).toMatchObject([
      { workout: { id: 1, blocks: [{ zone: 2 }] } },
      { workout: { id: 2, blocks: [] } },
    ]);
  });

  it('stores every day empty when there are no events or Activities', async () => {
    const { itemsByDate, completedEventIds } = await storedItems();

    expect(Object.keys(itemsByDate)).toHaveLength(14);
    expect(Object.values(itemsByDate).flat()).toEqual([]);
    expect(completedEventIds).toEqual([]);
  });

  it('keeps the stored items and completed event IDs plain JSON, without a status, so the query cache can store them', async () => {
    const stored = await storedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-14T08:00:00' }),
        intervalsEvent({
          id: 2,
          category: 'RACE_A',
          name: 'Gran Fondo',
          start_date_local: '2026-10-18T09:00:00',
        }),
      ],
      activities: [
        intervalsActivity({ id: 'paired', paired_event_id: 1 }),
        intervalsActivity({ id: 'race', paired_event_id: 2 }),
        intervalsActivity({ id: 'unplanned' }),
      ],
    });

    expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
    expect(stored.completedEventIds).toEqual([1, 2]);
    expect(JSON.stringify(stored)).not.toContain('"status"');
  });

  it('takes only a read that fetched every tile field, so no tile silently loses its load', async () => {
    const readWithoutLoad = await readCalendarRange(
      fakeCalendarReads(),
      TWO_OCTOBER_WEEKS,
      { activityFields: ['moving_time', 'distance'] },
    );

    // @ts-expect-error: icu_training_load is optional, so only the fields the read was typed with can catch its absence
    toStoredCalendarItems(readWithoutLoad, TWO_OCTOBER_WEEKS, ZONE_CONFIG);
  });
});

describe('withItemStatuses', () => {
  const TODAY = '2026-10-14';

  it("derives each Workout's status as of today: missed before it, planned from it on, completed when paired", async () => {
    const stored = await storedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-13T08:00:00' }),
        intervalsEvent({ id: 2, start_date_local: '2026-10-14T08:00:00' }),
        intervalsEvent({ id: 3, start_date_local: '2026-10-12T08:00:00' }),
      ],
      activities: [
        intervalsActivity({
          paired_event_id: 3,
          start_date_local: '2026-10-12T18:00:00',
        }),
      ],
    });

    const selected = withItemStatuses(stored, TODAY);

    expect(selected['2026-10-12']).toMatchObject([
      { workout: { id: 3, status: 'completed' } },
    ]);
    expect(selected['2026-10-13']).toMatchObject([
      { workout: { id: 1, status: 'missed' } },
    ]);
    expect(selected['2026-10-14']).toMatchObject([
      { workout: { id: 2, status: 'planned' } },
    ]);
    expect(selected['2026-10-15']).toEqual([]);
  });

  it('turns a Workout from planned to missed once its day has passed, without a new read', async () => {
    const stored = await storedItems({
      events: [
        intervalsEvent({ id: 1, start_date_local: '2026-10-14T08:00:00' }),
      ],
    });

    expect(withItemStatuses(stored, '2026-10-14')['2026-10-14']).toMatchObject([
      { workout: { status: 'planned' } },
    ]);
    expect(withItemStatuses(stored, '2026-10-15')['2026-10-14']).toMatchObject([
      { workout: { status: 'missed' } },
    ]);
  });

  it('gives a Race and an Unplanned Activity no status, so a past Race is never missed', async () => {
    const stored = await storedItems({
      events: [
        intervalsEvent({
          id: 3,
          category: 'RACE_B',
          name: 'Gravel Race',
          type: 'Ride',
          start_date_local: '2026-10-13T00:00:00',
        }),
      ],
      activities: [
        intervalsActivity({ start_date_local: '2026-10-13T18:00:00' }),
      ],
    });

    expect(withItemStatuses(stored, TODAY)['2026-10-13']).toEqual(
      stored.itemsByDate['2026-10-13'],
    );
  });
});

describe('findWorkout', () => {
  const PLANNED_DAY: CalendarRange = {
    oldest: '2026-10-14',
    newest: '2026-10-14',
  };

  it('finds a Workout ridden days after its planned day, with its Activity, from a read of the planned day alone', async () => {
    const planned = intervalsEvent({
      id: 42,
      start_date_local: '2026-10-14T08:00:00',
    });
    const paired = await readCalendarRange(
      fakeCalendarReads({
        events: [intervalsEvent({ id: 7 }), planned],
        activities: [
          intervalsActivity({
            id: 'later',
            paired_event_id: 42,
            start_date_local: '2026-10-17T18:00:00',
            icu_average_watts: 212,
          }),
        ],
      }),
      PLANNED_DAY,
      { activityFields: ['icu_average_watts'] },
    );

    expect(findWorkout(paired, 42)).toEqual({
      kind: 'workout',
      event: planned,
      activity: expect.objectContaining({
        id: 'later',
        start_date_local: '2026-10-17T18:00:00',
        icu_average_watts: 212,
      }),
      completed: true,
    });
  });

  it('finds no Workout for a Race, an Unplanned Activity or an id the read lacks', async () => {
    const paired = await readCalendarRange(
      fakeCalendarReads({
        events: [intervalsEvent({ id: 5, category: 'RACE_A' })],
        activities: [intervalsActivity({ id: '6' })],
      }),
      PLANNED_DAY,
      { activityFields: [] },
    );

    expect(paired.items).toHaveLength(2);
    expect(findWorkout(paired, 5)).toBeUndefined();
    expect(findWorkout(paired, 6)).toBeUndefined();
    expect(findWorkout(paired, 42)).toBeUndefined();
  });
});

describe('calendarItemKey', () => {
  it('keeps a Workout, a Race and an Activity apart even when their ids collide', () => {
    expect([
      calendarItemKey({
        kind: 'workout',
        workout: {
          id: 7,
          name: 'Ride',
          date: '2026-10-14',
          blocks: [],
          completedWithStravaActivity: false,
        },
      }),
      calendarItemKey({
        kind: 'race',
        race: {
          id: 7,
          name: 'Race',
          priority: 'A',
          date: '2026-10-14',
          sport: 'Ride',
        },
      }),
      calendarItemKey({
        kind: 'activity',
        activity: { id: '7', name: 'Zwift', type: 'Ride', date: '2026-10-14' },
      }),
    ]).toEqual(['workout-7', 'race-7', 'activity-7']);
  });
});

describe('activityMetrics', () => {
  it('lists duration in seconds, distance in meters and load, in that order', () => {
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
