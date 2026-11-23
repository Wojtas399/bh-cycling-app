import { buildActivityDetails } from '../activityDetails';
import { findWorkout } from '../calendarItems';
import {
  type IntervalsActivity,
  IntervalsApiError,
  type IntervalsCalendarEvent,
  type IntervalsWorkoutDoc,
  getActivities,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
  isNotFoundError,
} from '../intervalsApi';
import {
  activityDetailsQueryOptions,
  athleteSettingsQueryOptions,
  fitnessQueryOptions,
  intervalsKeys,
  monthQueryOptions,
  nextRaceQueryOptions,
  noteDetailsQueryOptions,
  raceQueryOptions,
  routeQueryOptions,
  selectMonthAsOf,
  selectWorkoutDetailsAsOf,
  todayQueryOptions,
  upcomingQueryOptions,
  workoutDetailsQueryOptions,
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
  getCalendarEvent: jest.fn(),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const TODAY = '2026-02-11';
const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

const mockGetActivities = jest.mocked(getActivities);
const mockGetCalendarEvent = jest.mocked(getCalendarEvent);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);

const ATHLETE_ZONES = [60, 80, 95, 110, 130, 160, 220];
const ATHLETE_Z2 = { zone: 2, minPct: 60, maxPct: 80 };

const ZONE_2_HOUR: IntervalsWorkoutDoc = {
  duration: 3600,
  steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
};

function workoutOnTheDayTheSuiteRuns(
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
  });
});

describe('query keys', () => {
  it.each([
    ['the athlete settings', athleteSettingsQueryOptions(CREDENTIALS).queryKey],
    ['the upcoming items', upcomingQueryOptions(CREDENTIALS, TODAY).queryKey],
    ['the next Race', nextRaceQueryOptions(CREDENTIALS, TODAY).queryKey],
    ["today's Wellness Entry", todayQueryOptions(CREDENTIALS, TODAY).queryKey],
    ['the Fitness year', fitnessQueryOptions(CREDENTIALS, TODAY).queryKey],
    [
      'a month',
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY))
        .queryKey,
    ],
    [
      "a Workout's details",
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ).queryKey,
    ],
    ['a Note', noteDetailsQueryOptions(CREDENTIALS, 42).queryKey],
    [
      "an Activity's details",
      activityDetailsQueryOptions(CREDENTIALS, 'i42', buildActivityDetails)
        .queryKey,
    ],
    ['a paired Race', raceQueryOptions(CREDENTIALS, 42).queryKey],
    ['a Route', routeQueryOptions(CREDENTIALS, 'i42').queryKey],
  ])(
    "keys %s under the athlete's prefix, never by the access token",
    (_, queryKey) => {
      expect(queryKey.slice(0, 2)).toEqual(['intervals', 'athlete-1']);
      expect(JSON.stringify(queryKey)).not.toContain(CREDENTIALS.accessToken);
    },
  );

  it('keys a query skipped for want of credentials under no athlete', () => {
    expect(athleteSettingsQueryOptions(null).queryKey).toEqual([
      'intervals',
      undefined,
      'athleteSettings',
    ]);
  });

  it('keys a query skipped for want of an id under a null id', () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, null, buildActivityDetails)
        .queryKey,
    ).toEqual(['intervals', 'athlete-1', 'activity', null]);
    expect(raceQueryOptions(CREDENTIALS, null).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'race',
      null,
    ]);
    expect(routeQueryOptions(CREDENTIALS, null).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'route',
      null,
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

  it.each([
    ['the next Race', nextRaceQueryOptions(CREDENTIALS, TODAY)],
    ["today's Wellness Entry", todayQueryOptions(CREDENTIALS, TODAY)],
    [
      "a Workout's details",
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ),
    ],
    ['a Note', noteDetailsQueryOptions(CREDENTIALS, 42)],
    ['a paired Race', raceQueryOptions(CREDENTIALS, 42)],
  ])('lets %s go stale after 5 minutes and refetch on focus', (_, options) => {
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

describe('noteDetailsQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the event by its id and stores it as a Note', async () => {
    mockGetCalendarEvent.mockResolvedValue({
      id: 7,
      category: 'NOTE',
      name: 'Camp briefing',
      description: 'Pack the rain jacket.',
      color: '#ff0000',
      start_date_local: '2026-11-20T00:00:00',
      end_date_local: '2026-11-23T00:00:00',
    });

    const note = await createQueryClient().fetchQuery(
      noteDetailsQueryOptions(CREDENTIALS, 7),
    );

    expect(note).toEqual({
      id: 7,
      name: 'Camp briefing',
      description: 'Pack the rain jacket.',
      color: '#ff0000',
      start: '2026-11-20',
      end: '2026-11-23',
    });
    expect(mockGetCalendarEvent).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      7,
      {
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('fails as not found when the event is not a Note', async () => {
    mockGetCalendarEvent.mockResolvedValue({
      id: 7,
      category: 'WORKOUT',
      name: 'Sweet spot',
      start_date_local: '2026-11-20T08:00:00',
    });

    const error = await createQueryClient()
      .fetchQuery(noteDetailsQueryOptions(CREDENTIALS, 7))
      .catch((caught: unknown) => caught);

    expect(isNotFoundError(error)).toBe(true);
  });

  it('fails as not found when the event was deleted', async () => {
    mockGetCalendarEvent.mockRejectedValue(new IntervalsApiError(404));

    const error = await createQueryClient()
      .fetchQuery(noteDetailsQueryOptions(CREDENTIALS, 7))
      .catch((caught: unknown) => caught);

    expect(isNotFoundError(error)).toBe(true);
  });

  it("keys the Note by its event id under the athlete's prefix", () => {
    expect(noteDetailsQueryOptions(CREDENTIALS, 7).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'note',
      7,
    ]);
  });

  it('is skipped without credentials', () => {
    expect(noteDetailsQueryOptions(null, 7).queryFn).toBe(skipToken);
  });
});

describe('athleteSettingsQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores the athlete's own zone boundaries, not Coggan's, and current FTP", async () => {
    mockGetAthleteSettings.mockResolvedValue({
      powerZones: ATHLETE_ZONES,
      ftp: 265,
    });

    const client = createQueryClient();
    const settings = await client.fetchQuery(
      athleteSettingsQueryOptions(CREDENTIALS),
    );

    expect(settings.zoneConfig[1]).toEqual(ATHLETE_Z2);
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
        fields: [
          'id',
          'start_date_local',
          'type',
          'paired_event_id',
          'name',
          'moving_time',
          'distance',
          'icu_training_load',
        ],
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("lists today's items as of the day in its key, statuses included", async () => {
    mockGetCalendarEvents.mockResolvedValue([
      workoutOnTheDayTheSuiteRuns({ start_date_local: '2026-10-11T08:00:00' }),
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
      workoutOnTheDayTheSuiteRuns({ workout_doc: ZONE_2_HOUR }),
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
      workoutOnTheDayTheSuiteRuns({ workout_doc: ZONE_2_HOUR }),
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

  it('fails when the Notes call fails', async () => {
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) => {
        if (params?.category === 'NOTE') throw new Error('notes down');

        return [];
      },
    );

    const client = createQueryClient();

    await expect(
      client.fetchQuery(upcomingQueryOptions(CREDENTIALS, '2026-10-11')),
    ).rejects.toThrow('notes down');
  });
});

describe('monthQueryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it("reads the month's events and Activities from the Intervals API through the Calendar Items module", async () => {
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
        fields: [
          'id',
          'start_date_local',
          'type',
          'paired_event_id',
          'name',
          'moving_time',
          'distance',
          'icu_training_load',
        ],
      },
      { signal: expect.any(AbortSignal) },
    );
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
    const campStartedInLookBackCoveringFirstDays = noteEvent({
      id: 3,
      name: 'Obóz',
      start_date_local: '2026-01-28T00:00:00',
      end_date_local: '2026-02-03T00:00:00',
    });
    const noteEndedBeforeTheMonth = noteEvent({
      id: 5,
      start_date_local: '2026-01-10T00:00:00',
      end_date_local: '2026-01-12T00:00:00',
    });

    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE'
          ? [
              noteEvent({
                id: 7,
                start_date_local: '2026-02-20T00:00:00',
              }),
              campStartedInLookBackCoveringFirstDays,
              noteEndedBeforeTheMonth,
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
      async (_token, _athlete, params) =>
        params?.category === 'NOTE'
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
      async (_token, _athlete, params) => {
        if (params?.category === 'NOTE') throw new Error('notes down');

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
});

describe('workoutDetailsQueryOptions', () => {
  const SINGLE_READ = workoutEvent({
    id: 42,
    start_date_local: '2026-02-11T08:00:00',
  });
  const LISTED = {
    ...SINGLE_READ,
    paired_activity_id: '20664018356',
    workout_doc: {
      steps: [
        {
          duration: 600,
          power: { units: '%ftp', value: 90 },
          _power: { units: 'w', value: 239 },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
    mockGetActivities.mockResolvedValue([]);
    mockGetCalendarEvent.mockResolvedValue(SINGLE_READ);
  });

  it('takes the Workout from the Workouts listed a week past each side of its day, since the single read lacks paired_activity_id and step watts', async () => {
    mockGetCalendarEvents.mockResolvedValue([workoutEvent({ id: 7 }), LISTED]);

    const client = createQueryClient();
    const stored = await client.fetchQuery(
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ),
    );

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2026-02-04',
        newest: '2026-02-18',
        category: 'WORKOUT',
        resolve: true,
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(findWorkout(stored.paired, 42)?.event).toEqual(LISTED);
  });

  it('falls back to the single read when the listed Workouts lack the event', async () => {
    mockGetCalendarEvents.mockResolvedValue([workoutEvent({ id: 7 })]);

    const client = createQueryClient();
    const stored = await client.fetchQuery(
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ),
    );

    expect(findWorkout(stored.paired, 42)?.event).toEqual(SINGLE_READ);
  });
});

function workoutEvent(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sweet spot',
    start_date_local: '2026-02-11T08:00:00',
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
