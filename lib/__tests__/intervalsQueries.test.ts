import {
  type IntervalsCalendarEvent,
  type IntervalsWorkoutDoc,
  getAthleteSettings,
  getCalendarEvents,
} from '../intervalsApi';
import {
  athleteSettingsQueryOptions,
  intervalsKeys,
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
  getAthleteSettings: jest.fn(),
}));

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
      athleteSettingsQueryOptions('token-1', 'athlete-1'),
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
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-11'),
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
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-11'),
    );

    expect(workouts[0].blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
  });

  it('reuses the cached athlete settings instead of fetching them again', async () => {
    mockGetCalendarEvents.mockResolvedValue([]);

    const client = createQueryClient();

    await client.fetchQuery(
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-11'),
    );
    await client.fetchQuery(
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-12'),
    );

    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Coggan zones and still lists workouts when the settings fetch fails', async () => {
    mockGetAthleteSettings.mockRejectedValue(new Error('settings unavailable'));
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const client = createQueryClient();
    const workouts = await client.fetchQuery(
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-11'),
    );

    expect(workouts[0].blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('retries the settings on the next fetch after they failed', async () => {
    mockGetAthleteSettings.mockRejectedValueOnce(new Error('settings down'));
    mockGetCalendarEvents.mockResolvedValue([]);

    const client = createQueryClient();

    await client.fetchQuery(
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-11'),
    );
    await client.fetchQuery(
      upcomingQueryOptions('token-1', 'athlete-1', '2026-10-12'),
    );

    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(2);
    expect(
      client.getQueryData(intervalsKeys.athleteSettings('athlete-1')),
    ).toEqual(resolveZoneConfig({ powerZones: ATHLETE_ZONES }));
  });
});
