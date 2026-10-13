import type { StoredMonth } from '../calendarWorkouts';
import {
  type IntervalsActivity,
  type IntervalsCalendarEvent,
  type IntervalsWorkoutDoc,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '../intervalsApi';
import {
  athleteSettingsQueryOptions,
  intervalsKeys,
  monthQueryOptions,
  selectMonthAsOf,
  upcomingQueryOptions,
} from '../intervalsQueries';
import { toLocalDateString } from '../localDate';
import { resolveZoneConfig } from '../powerZones';
import { createQueryClient } from '../queryClient';

jest.mock('../handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../intervalsApi', () => ({
  ...jest.requireActual('../intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const TODAY = '2026-02-11';
const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

const mockGetActivities = getActivities as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

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
});

describe('athleteSettingsQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the zone config resolved from the athlete settings', async () => {
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });

    const client = createQueryClient();
    const zones = await client.fetchQuery(
      athleteSettingsQueryOptions(CREDENTIALS),
    );

    // This athlete's Z2 is 60–80% FTP, not the Coggan 55–75%.
    expect(zones[1]).toEqual({ zone: 2, minPct: 60, maxPct: 80 });
    expect(mockGetAthleteSettings).toHaveBeenCalledWith('token-1', {
      signal: expect.any(AbortSignal),
    });
  });
});

describe('upcomingQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
  });

  it("fetches today's and tomorrow's events and maps the workouts", async () => {
    mockGetCalendarEvents.mockResolvedValue([todayEvent()]);

    const client = createQueryClient();
    const workouts = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, '2026-10-11'),
    );

    expect(workouts).toEqual([
      { id: 1, name: 'Intervals', dayLabel: 'today', blocks: [] },
    ]);
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2026-10-11', newest: '2026-10-12' },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('builds the profile blocks against the athlete own zone boundaries', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const client = createQueryClient();
    const workouts = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, '2026-10-11'),
    );

    expect(workouts[0].blocks).toEqual([
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
    const workouts = await client.fetchQuery(
      upcomingQueryOptions(CREDENTIALS, '2026-10-11'),
    );

    expect(workouts[0].blocks).toEqual([
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
    ).toEqual(resolveZoneConfig({ powerZones: ATHLETE_ZONES }));
  });
});

describe('monthQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it("fetches the month's events and activities a week past each edge", async () => {
    const client = createQueryClient();

    await client.fetchQuery(
      monthQueryOptions(CREDENTIALS, '2026-06', selectMonthAsOf('2026-06-15')),
    );

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2026-06-01', newest: '2026-06-30' },
      { signal: expect.any(AbortSignal) },
    );
    expect(mockGetActivities).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2026-05-25',
        newest: '2026-07-07',
        fields: 'id,start_date_local,type,paired_event_id',
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

    expect(Object.keys(stored?.workoutsByDate ?? {})).toHaveLength(28);
    expect(stored?.workoutsByDate['2026-02-01']).toEqual([]);
    expect(stored?.workoutsByDate['2026-02-10']).toEqual([
      { id: 1, name: 'Intervals', date: '2026-02-10', blocks: [] },
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
    const selected = options.select!(stored);

    expect(selected['2026-02-01']).toEqual([]);
    expect(selected['2026-02-10'][0].status).toBe('missed');
    expect(selected['2026-02-09'][0].status).toBe('completed');
    expect(selected['2026-02-11'][0].status).toBe('planned');

    const nextDay = monthQueryOptions(
      CREDENTIALS,
      '2026-02',
      selectMonthAsOf('2026-02-12'),
    );

    expect(nextDay.select!(stored)['2026-02-11'][0].status).toBe('missed');
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

    expect(stored.workoutsByDate['2026-02-10'][0].blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });
});
