import { buildActivityDetails } from '../activityDetails';
import type { StoredMonth } from '../calendarWorkouts';
import {
  type IntervalsActivity,
  IntervalsApiError,
  type IntervalsCalendarEvent,
  type IntervalsWorkoutDoc,
  getActivities,
  getActivityStreams,
  getAthleteSettings,
  getCalendarEvents,
} from '../intervalsApi';
import {
  activityDetailsQueryOptions,
  activityStreamQueryOptions,
  athleteSettingsQueryOptions,
  fitnessQueryOptions,
  intervalsKeys,
  monthQueryOptions,
  routeQueryOptions,
  selectMonthAsOf,
  upcomingQueryOptions,
} from '../intervalsQueries';
import { toLocalDateString } from '../localDate';
import { resolveZoneConfig } from '../powerZones';
import { createQueryClient } from '../queryClient';
import { skipToken } from '@tanstack/react-query';

jest.mock('../handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../intervalsApi', () => ({
  ...jest.requireActual('../intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getActivityStreams: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const TODAY = '2026-02-11';
const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

const mockGetActivities = getActivities as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;
const mockGetActivityStreams = getActivityStreams as jest.Mock;

const ATHLETE_ZONES = [60, 80, 95, 110, 130, 160, 220];

const ZONE_2_HOUR: IntervalsWorkoutDoc = {
  duration: 3600,
  steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
};

/** A workout scheduled for today, whichever day the suite happens to run on. */
function todayEvent(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Intervals',
    start_date_local: `${toLocalDateString(new Date())}T08:00:00`,
    ...overrides,
  };
}

describe('intervalsKeys', () => {
  it('nests every key under the intervals prefix and the athlete', () => {
    expect(intervalsKeys.all).toEqual(['intervals']);
    expect(intervalsKeys.athlete('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
    ]);
    expect(intervalsKeys.athleteSettings('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
      'athleteSettings',
    ]);
    expect(intervalsKeys.upcoming('athlete-1', '2026-10-11')).toEqual([
      'intervals',
      'athlete-1',
      'upcoming',
      '2026-10-11',
    ]);
    expect(intervalsKeys.calendar('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
      'calendar',
    ]);
    expect(intervalsKeys.month('athlete-1', '2026-06')).toEqual([
      'intervals',
      'athlete-1',
      'calendar',
      'month',
      '2026-06',
    ]);
    expect(intervalsKeys.route('athlete-1', 'i42')).toEqual([
      'intervals',
      'athlete-1',
      'route',
      'i42',
    ]);
    expect(intervalsKeys.activity('athlete-1', 'i42')).toEqual([
      'intervals',
      'athlete-1',
      'activity',
      'i42',
    ]);
    expect(intervalsKeys.stream('athlete-1', 'i42')).toEqual([
      'intervals',
      'athlete-1',
      'stream',
      'i42',
    ]);
  });
});

describe('freshness', () => {
  const FIVE_MINUTES = 5 * 60_000;

  it('keeps the athlete settings fresh for the whole session', () => {
    expect(athleteSettingsQueryOptions(CREDENTIALS).staleTime).toBe(Infinity);
  });

  it('lets the upcoming workouts go stale after 5 minutes and refetch on focus', () => {
    const options = upcomingQueryOptions(CREDENTIALS, '2026-10-11');

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it('lets a month go stale after 5 minutes and refetch on focus', () => {
    const options = monthQueryOptions(
      CREDENTIALS,
      '2026-06',
      selectMonthAsOf('2026-06-15'),
    );

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it("lets an Activity's details go stale after 5 minutes and refetch on focus", () => {
    const options = activityDetailsQueryOptions(
      CREDENTIALS,
      'i42',
      buildActivityDetails,
    );

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it('lets the Fitness year go stale after 5 minutes and refetch on focus', () => {
    const options = fitnessQueryOptions(CREDENTIALS, '2026-11-06');

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});

describe('fitnessQueryOptions', () => {
  it('is skipped without credentials', () => {
    expect(fitnessQueryOptions(null, '2026-11-06').queryFn).toBe(skipToken);
  });
});

describe('activityDetailsQueryOptions', () => {
  it("keys the Activity by its id under the athlete's prefix", () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, 'i42', buildActivityDetails)
        .queryKey,
    ).toEqual(['intervals', 'athlete-1', 'activity', 'i42']);
  });

  it('is skipped without credentials', () => {
    expect(
      activityDetailsQueryOptions(null, 'i42', buildActivityDetails).queryFn,
    ).toBe(skipToken);
  });

  it('is skipped without an Activity id', () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, null, buildActivityDetails)
        .queryFn,
    ).toBe(skipToken);
  });
});

describe('routeQueryOptions', () => {
  it("keys the Route by the Activity id under the athlete's prefix", () => {
    expect(routeQueryOptions(CREDENTIALS, 'i42').queryKey).toEqual([
      'intervals',
      'athlete-1',
      'route',
      'i42',
    ]);
  });

  it('is skipped without an Activity id', () => {
    expect(routeQueryOptions(CREDENTIALS, null).queryFn).toBe(skipToken);
  });

  it('is skipped without credentials', () => {
    expect(routeQueryOptions(null, 'i42').queryFn).toBe(skipToken);
  });

  it('keeps a loaded Route fresh forever', () => {
    expect(routeQueryOptions(CREDENTIALS, 'i42').staleTime).toBe(Infinity);
  });
});

describe('activityStreamQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function fetchStream() {
    return createQueryClient().fetchQuery(
      activityStreamQueryOptions(CREDENTIALS, 'i42'),
    );
  }

  it("keys the stream by the Activity id under the athlete's prefix", () => {
    expect(activityStreamQueryOptions(CREDENTIALS, 'i42').queryKey).toEqual([
      'intervals',
      'athlete-1',
      'stream',
      'i42',
    ]);
  });

  it('is skipped without an Activity id', () => {
    expect(activityStreamQueryOptions(CREDENTIALS, null).queryFn).toBe(
      skipToken,
    );
  });

  it('is skipped without credentials', () => {
    expect(activityStreamQueryOptions(null, 'i42').queryFn).toBe(skipToken);
  });

  it('keeps a loaded stream fresh forever, as a recorded ride never changes', () => {
    expect(activityStreamQueryOptions(CREDENTIALS, 'i42').staleTime).toBe(
      Infinity,
    );
  });

  it("stores the ride's time and watts streams", async () => {
    mockGetActivityStreams.mockResolvedValue([
      { type: 'time', data: [0, 1, 2] },
      { type: 'watts', data: [180, null, 210] },
    ]);

    await expect(fetchStream()).resolves.toEqual({
      time: [0, 1, 2],
      watts: [180, null, 210],
    });
    expect(mockGetActivityStreams).toHaveBeenCalledWith(
      'token-1',
      'i42',
      { types: ['time', 'watts'] },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('resolves to null, no stream, when intervals.icu has none (404)', async () => {
    mockGetActivityStreams.mockRejectedValue(new IntervalsApiError(404));

    await expect(fetchStream()).resolves.toBeNull();
  });

  it.each([
    ['an empty response', []],
    ['no watts', [{ type: 'time', data: [0, 1] }]],
  ])('resolves to null, no stream, for %s', async (_, streams) => {
    mockGetActivityStreams.mockResolvedValue(streams);

    await expect(fetchStream()).resolves.toBeNull();
  });

  it('fails on any other error', async () => {
    mockGetActivityStreams.mockRejectedValue(new IntervalsApiError(500));

    await expect(fetchStream()).rejects.toMatchObject({ status: 500 });
  });
});

describe('athleteSettingsQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the zone config and current FTP resolved from the athlete settings', async () => {
    mockGetAthleteSettings.mockResolvedValue({
      powerZones: ATHLETE_ZONES,
      ftp: 265,
    });

    const client = createQueryClient();
    const settings = await client.fetchQuery(
      athleteSettingsQueryOptions(CREDENTIALS),
    );

    // This athlete's Z2 is 60–80% FTP, not the Coggan 55–75%.
    expect(settings.zoneConfig[1]).toEqual({ zone: 2, minPct: 60, maxPct: 80 });
    expect(settings.ftp).toBe(265);
    expect(mockGetAthleteSettings).toHaveBeenCalledWith('token-1', {
      signal: expect.any(AbortSignal),
    });
  });

  it.each([
    ['no FTP', undefined],
    ['an FTP of zero', 0],
  ])('stores no current FTP when the athlete has %s', async (_, ftp) => {
    mockGetAthleteSettings.mockResolvedValue({
      powerZones: ATHLETE_ZONES,
      ftp,
    });

    const client = createQueryClient();
    const settings = await client.fetchQuery(
      athleteSettingsQueryOptions(CREDENTIALS),
    );

    expect(settings.ftp).toBeNull();
  });

  it('is skipped without credentials', () => {
    expect(athleteSettingsQueryOptions(null).queryFn).toBe(skipToken);
  });
});

describe('upcomingQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
    mockGetActivities.mockResolvedValue([]);
  });

  it("fetches today's and tomorrow's events and Activities a week past each edge", async () => {
    mockGetCalendarEvents.mockResolvedValue([]);

    const client = createQueryClient();

    await client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-11'));

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2026-10-04', newest: '2026-10-19' },
      { signal: expect.any(AbortSignal) },
    );
    expect(mockGetActivities).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2026-10-04',
        newest: '2026-10-19',
        fields:
          'id,start_date_local,type,paired_event_id,name,moving_time,distance,icu_training_load',
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("lists today's items as of the day in its key, statuses included", async () => {
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ start_date_local: '2026-10-11T08:00:00' }),
    ]);
    mockGetActivities.mockResolvedValue([
      {
        id: 'a1',
        name: 'Zwift',
        type: 'VirtualRide',
        start_date_local: '2026-10-11T18:00:00',
        moving_time: 1620,
        distance: 14000,
      } satisfies IntervalsActivity,
    ]);

    const client = createQueryClient();
    const items = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, '2026-10-11'),
    );

    expect(items).toEqual([
      {
        kind: 'workout',
        dayLabel: 'today',
        workout: {
          id: 1,
          name: 'Intervals',
          date: '2026-10-11',
          status: 'planned',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
      {
        kind: 'activity',
        dayLabel: 'today',
        activity: {
          id: 'a1',
          name: 'Zwift',
          type: 'VirtualRide',
          date: '2026-10-11',
          durationSeconds: 1620,
          distanceMeters: 14000,
        },
      },
    ]);
  });

  it('builds the profile blocks against the athlete own zone boundaries', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const client = createQueryClient();
    const items = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, toLocalDateString(new Date())),
    );

    expect(items[0].kind === 'workout' && items[0].workout.blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
  });

  it('reuses the cached athlete settings instead of fetching them again', async () => {
    mockGetCalendarEvents.mockResolvedValue([]);

    const client = createQueryClient();

    await client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-11'));
    await client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-12'));

    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Coggan zones and still lists workouts when the settings fetch fails', async () => {
    mockGetAthleteSettings.mockRejectedValue(new Error('settings unavailable'));
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const client = createQueryClient();
    const items = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, toLocalDateString(new Date())),
    );

    expect(items[0].kind === 'workout' && items[0].workout.blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('retries the settings on the next fetch after they failed', async () => {
    mockGetAthleteSettings.mockRejectedValueOnce(new Error('settings down'));
    mockGetCalendarEvents.mockResolvedValue([]);

    const client = createQueryClient();

    await client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-11'));
    await client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-12'));

    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(2);
    expect(
      client.getQueryData(intervalsKeys.athleteSettings('athlete-1')),
    ).toEqual({
      zoneConfig: resolveZoneConfig({ powerZones: ATHLETE_ZONES }),
      ftp: null,
    });
  });
});

describe('monthQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it("fetches the month's events and activities a week past each edge, since an item moves to its Activity's day", async () => {
    const client = createQueryClient();

    await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-06', selectMonthAsOf('2026-06-15')),
    );

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2026-05-25', newest: '2026-07-07' },
      { signal: expect.any(AbortSignal) },
    );
    expect(mockGetActivities).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2026-05-25',
        newest: '2026-07-07',
        fields:
          'id,start_date_local,type,paired_event_id,name,moving_time,distance,icu_training_load',
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('stores every day of the month, empty when it has no workouts, without a status', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'WORKOUT',
        name: 'Intervals',
        start_date_local: '2026-02-10T08:00:00',
      },
    ]);

    const client = createQueryClient();

    await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    const stored = client.getQueryData<StoredMonth>(
      intervalsKeys.month('athlete-1', '2026-02'),
    );

    expect(Object.keys(stored?.itemsByDate ?? {})).toHaveLength(28);
    expect(stored?.itemsByDate['2026-02-01']).toEqual([]);
    expect(stored?.itemsByDate['2026-02-10']).toEqual([
      {
        kind: 'workout',
        workout: {
          id: 1,
          name: 'Intervals',
          date: '2026-02-10',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
    ]);
    expect(stored?.completedEventIds).toEqual([]);
  });

  it('stores the IDs of the events a paired activity completes', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 42,
        category: 'WORKOUT',
        name: 'Intervals',
        start_date_local: '2026-02-10T08:00:00',
      },
    ]);
    mockGetActivities.mockResolvedValue([
      {
        id: 'a1',
        name: 'Ride',
        type: 'Ride',
        start_date_local: '2026-02-11T08:00:00',
        moving_time: 3600,
        distance: 30000,
        paired_event_id: 42,
      } satisfies IntervalsActivity,
    ]);

    const client = createQueryClient();

    await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    expect(
      client.getQueryData<StoredMonth>(
        intervalsKeys.month('athlete-1', '2026-02'),
      )?.completedEventIds,
    ).toEqual([42]);
  });

  it("selects each workout's status as of today", async () => {
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'WORKOUT',
        name: 'Past',
        start_date_local: '2026-02-10T08:00:00',
      },
      {
        id: 2,
        category: 'WORKOUT',
        name: 'Done',
        start_date_local: '2026-02-09T08:00:00',
      },
      {
        id: 3,
        category: 'WORKOUT',
        name: 'Today',
        start_date_local: '2026-02-11T08:00:00',
      },
    ]);
    mockGetActivities.mockResolvedValue([
      {
        id: 'a1',
        name: 'Ride',
        type: 'Ride',
        start_date_local: '2026-02-09T08:00:00',
        moving_time: 3600,
        distance: 30000,
        paired_event_id: 2,
      } satisfies IntervalsActivity,
    ]);

    const client = createQueryClient();
    const options = monthQueryOptions(
      CREDENTIALS,
      '2026-02',
      selectMonthAsOf(TODAY),
    );

    await client.fetchQuery(options);

    const stored = client.getQueryData<StoredMonth>(options.queryKey)!;
    const selected = options.select!(stored).itemsByDate;

    expect(selected['2026-02-01']).toEqual([]);
    expect(selected['2026-02-10']).toMatchObject([
      { workout: { status: 'missed' } },
    ]);
    expect(selected['2026-02-09']).toMatchObject([
      { workout: { status: 'completed' } },
    ]);
    expect(selected['2026-02-11']).toMatchObject([
      { workout: { status: 'planned' } },
    ]);

    const nextDay = monthQueryOptions(
      CREDENTIALS,
      '2026-02',
      selectMonthAsOf('2026-02-12'),
    );

    expect(nextDay.select!(stored).itemsByDate['2026-02-11']).toMatchObject([
      { workout: { status: 'missed' } },
    ]);
  });

  it('falls back to the Coggan zones when the settings fetch fails', async () => {
    mockGetAthleteSettings.mockRejectedValue(new Error('settings unavailable'));
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'WORKOUT',
        name: 'Intervals',
        start_date_local: '2026-02-10T08:00:00',
        workout_doc: ZONE_2_HOUR,
      },
    ]);

    const client = createQueryClient();
    const stored = await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    expect(stored.itemsByDate['2026-02-10']).toMatchObject([
      {
        workout: {
          blocks: [{ widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 }],
        },
      },
    ]);
  });

  it("fetches the month's Notes from 31 days before it to its last day", async () => {
    const client = createQueryClient();

    await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2026-01-01', newest: '2026-02-28', category: 'NOTE' },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('stores the whole Notes overlapping the month, in id order, apart from the days', async () => {
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params: { category?: string }) =>
        params.category === 'NOTE'
          ? [
              noteEvent({
                id: 7,
                start_date_local: '2026-02-20T00:00:00',
              }),
              // Started in the look-back, still covers 1–2 February.
              noteEvent({
                id: 3,
                name: 'Obóz',
                start_date_local: '2026-01-28T00:00:00',
                end_date_local: '2026-02-03T00:00:00',
              }),
              // Ended before the month began.
              noteEvent({
                id: 5,
                start_date_local: '2026-01-10T00:00:00',
                end_date_local: '2026-01-12T00:00:00',
              }),
            ]
          : [],
    );

    const client = createQueryClient();
    const stored = await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    expect(stored.notes).toEqual([
      {
        id: 3,
        name: 'Obóz',
        description: null,
        color: null,
        start: '2026-01-28',
        end: '2026-02-03',
      },
      expect.objectContaining({
        id: 7,
        start: '2026-02-20',
        end: '2026-02-21',
      }),
    ]);
    expect(Object.values(stored.itemsByDate).flat()).toEqual([]);
  });

  it('passes the Notes through select beside the items by day', async () => {
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params: { category?: string }) =>
        params.category === 'NOTE'
          ? [noteEvent({ id: 7, start_date_local: '2026-02-20T00:00:00' })]
          : [
              {
                id: 1,
                category: 'WORKOUT',
                name: 'Past',
                start_date_local: '2026-02-10T08:00:00',
              },
            ],
    );

    const client = createQueryClient();
    const options = monthQueryOptions(
      CREDENTIALS,
      '2026-02',
      selectMonthAsOf(TODAY),
    );
    const stored = await client.fetchQuery(options);
    const selected = options.select!(stored);

    expect(selected.notes).toMatchObject([{ id: 7 }]);
    expect(selected.itemsByDate['2026-02-10']).toMatchObject([
      { workout: { status: 'missed' } },
    ]);
  });

  it('fails when the Notes call fails', async () => {
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params: { category?: string }) => {
        if (params.category === 'NOTE') throw new Error('notes down');

        return [];
      },
    );

    const client = createQueryClient();

    await expect(
      client.fetchQuery(
        monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
      ),
    ).rejects.toThrow('notes down');
  });

  it('stores only the items whose day falls in the month', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      // Planned in March, ridden in February: shows in February.
      {
        id: 1,
        category: 'WORKOUT',
        name: 'Ridden early',
        start_date_local: '2026-03-01T08:00:00',
      },
      // Planned in February, ridden in March: shows in March.
      {
        id: 2,
        category: 'WORKOUT',
        name: 'Ridden late',
        start_date_local: '2026-02-28T08:00:00',
      },
    ]);
    mockGetActivities.mockResolvedValue([
      ride({
        id: 'early',
        paired_event_id: 1,
        start_date_local: '2026-02-28T18:00:00',
      }),
      ride({
        id: 'late',
        paired_event_id: 2,
        start_date_local: '2026-03-01T18:00:00',
      }),
      ride({ id: 'zwift', start_date_local: '2026-02-14T07:00:00' }),
      ride({ id: 'january', start_date_local: '2026-01-30T07:00:00' }),
    ]);

    const client = createQueryClient();
    const stored = await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY)),
    );

    const listed = Object.values(stored.itemsByDate).flat();

    expect(listed).toHaveLength(2);
    expect(stored.itemsByDate['2026-02-28']).toMatchObject([
      { kind: 'workout', workout: { id: 1, date: '2026-02-28' } },
    ]);
    expect(stored.itemsByDate['2026-02-14']).toMatchObject([
      { kind: 'activity', activity: { id: 'zwift' } },
    ]);
  });
});

function ride(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'a1',
    name: 'Ride',
    type: 'Ride',
    start_date_local: '2026-02-11T08:00:00',
    moving_time: 3600,
    distance: 30000,
    ...overrides,
  };
}

function noteEvent(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'NOTE',
    name: 'Notatka',
    start_date_local: '2026-02-11T00:00:00',
    ...overrides,
  };
}
