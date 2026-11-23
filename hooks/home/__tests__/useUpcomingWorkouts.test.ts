import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { addDays, toLocalDateString } from '@/lib/localDate';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);
const mockGetActivities = jest.mocked(getActivities);

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    scope: null,
    loading: false,
    ...overrides,
  });
}

function mockConnected() {
  mockConnection({
    isConnected: true,
    accessToken: 'token-1',
    athleteId: 'athlete-1',
  });
}

function workoutScheduledToday(): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Intervals',
    start_date_local: `${toLocalDateString(new Date())}T08:00:00`,
  };
}

const ATHLETE_ZONES = [60, 80, 95, 110, 130, 160, 220];

function zoneTwoHourToday(): IntervalsCalendarEvent {
  return {
    ...workoutScheduledToday(),
    workout_doc: {
      duration: 3600,
      steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
    },
  };
}

function mockZoneTwoHourToday() {
  mockGetCalendarEvents.mockImplementation(async (_token, _athlete, params) =>
    params?.category === 'NOTE' ? [] : [zoneTwoHourToday()],
  );
}

const ATHLETE_ZONE_2_BLOCK = {
  widthFraction: 1,
  minPct: 60,
  maxPct: 80,
  zone: 2,
};
const COGGAN_ZONE_2_BLOCK = {
  widthFraction: 1,
  minPct: 55,
  maxPct: 75,
  zone: 2,
};

describe('useUpcomingWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetActivities.mockResolvedValue([]);
  });

  it('is unavailable and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('unavailable');
    expect(result.current.query.isPending).toBe(true);
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
    expect(mockGetActivities).not.toHaveBeenCalled();
    expect(mockGetAthleteSettings).not.toHaveBeenCalled();
  });

  it('is loading and makes no API call while the connection itself resolves', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('loading');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is pending while the fetch is in flight', async () => {
    mockConnected();
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('available');
    expect(result.current.query.isPending).toBe(true);
  });

  it("caches today's items under the athlete and today's date with no Workout Status, which it applies as of today", async () => {
    mockConnected();
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE' ? [] : [workoutScheduledToday()],
    );
    const today = toLocalDateString(new Date());
    const workout = {
      id: 1,
      name: 'Intervals',
      date: today,
      blocks: [],
      completedWithStravaActivity: false,
    };

    const { result, client } = await renderHookWithClient(() =>
      useUpcomingWorkouts(),
    );

    await waitFor(() =>
      expect(result.current.query.data).toEqual([
        {
          kind: 'workout',
          dayLabel: 'today',
          workout: { ...workout, status: 'planned' },
        },
      ]),
    );
    expect(
      client.getQueryData(['intervals', 'athlete-1', 'upcoming', today]),
    ).toEqual({
      itemsByDate: {
        [today]: [{ kind: 'workout', workout }],
        [toLocalDateString(addDays(new Date(), 1))]: [],
      },
      completedEventIds: [],
      notes: [],
    });
  });

  it('fetches the Notes from 31 days before today to tomorrow', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([]);

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: toLocalDateString(addDays(new Date(), -31)),
        newest: toLocalDateString(addDays(new Date(), 1)),
        category: 'NOTE',
      },
      expect.anything(),
    );
  });

  it("lists today's Race first, from the events call it already makes, so only the events and Notes calls go out", async () => {
    mockConnected();
    const today = toLocalDateString(new Date());
    const race: IntervalsCalendarEvent = {
      id: 5,
      category: 'RACE_A',
      name: 'Mistrzostwa Polski',
      start_date_local: `${today}T00:00:00`,
      type: 'Ride',
    };

    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE' ? [] : [workoutScheduledToday(), race],
    );

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() =>
      expect(result.current.query.data).toMatchObject([
        { kind: 'race', dayLabel: 'today', race: { id: 5, priority: 'A' } },
        { kind: 'workout', dayLabel: 'today', workout: { id: 1 } },
      ]),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it("lists today's Notes from the Notes call after today's Workouts", async () => {
    mockConnected();
    const today = toLocalDateString(new Date());
    const note: IntervalsCalendarEvent = {
      id: 9,
      category: 'NOTE',
      name: 'Odżywianie',
      description: 'Dużo węgli',
      start_date_local: `${today}T00:00:00`,
    };

    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE' ? [note] : [workoutScheduledToday()],
    );

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() =>
      expect(result.current.query.data).toMatchObject([
        { kind: 'workout', dayLabel: 'today', workout: { id: 1 } },
        {
          kind: 'note',
          dayLabel: 'today',
          note: { id: 9, name: 'Odżywianie', description: 'Dużo węgli' },
        },
      ]),
    );
  });

  it("lists today's Strava Activity, as the list returns it, unpaired after today's Workout", async () => {
    mockConnected();
    const today = toLocalDateString(new Date());

    mockGetCalendarEvents.mockResolvedValue([workoutScheduledToday()]);
    mockGetActivities.mockResolvedValue([
      {
        id: '20679555658',
        start_date_local: `${today}T18:00:00`,
        moving_time: 0,
        distance: 0,
      },
    ]);

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() =>
      expect(result.current.query.data).toEqual([
        {
          kind: 'workout',
          dayLabel: 'today',
          workout: {
            id: 1,
            name: 'Intervals',
            date: today,
            status: 'planned',
            blocks: [],
            completedWithStravaActivity: false,
          },
        },
        {
          kind: 'activity',
          dayLabel: 'today',
          activity: { id: '20679555658', isStravaActivity: true, date: today },
        },
      ]),
    );
  });

  it('fails when the Notes call fails', async () => {
    mockConnected();
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) => {
        if (params?.category === 'NOTE') throw new Error('notes down');

        return [workoutScheduledToday()];
      },
    );

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.data).toBeUndefined();
  });

  it('refetches only the "Dziś i jutro" query, resolving once it settles', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([]);
    const upcomingKey = intervalsKeys.upcoming(
      'athlete-1',
      toLocalDateString(new Date()),
    );
    const otherKey = intervalsKeys.workout('athlete-1', 42);

    const { result, client } = await renderHookWithClient(() =>
      useUpcomingWorkouts(),
    );

    await waitFor(() => expect(result.current.query.data).toEqual([]));
    client.setQueryData(otherKey, { stale: true });
    const otherUpdatedAt = client.getQueryState(otherKey)?.dataUpdatedAt;

    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE' ? [] : [workoutScheduledToday()],
    );
    await act(() => result.current.refetch());

    expect(client.getQueryData(upcomingKey)).toMatchObject({
      itemsByDate: {
        [toLocalDateString(new Date())]: [
          { kind: 'workout', workout: { id: 1 } },
        ],
      },
    });
    expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(otherUpdatedAt);
  });

  describe('Workout Profile zones', () => {
    it("draws a Workout's profile in the athlete's own zones", async () => {
      mockConnected();
      mockGetAthleteSettings.mockResolvedValue({ powerZones: ATHLETE_ZONES });
      mockZoneTwoHourToday();

      const { result } = await renderHookWithClient(() =>
        useUpcomingWorkouts(),
      );

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject([
          { workout: { blocks: [ATHLETE_ZONE_2_BLOCK] } },
        ]),
      );
    });

    it("falls back to Coggan's zones and still lists the Workout when the athlete settings fail", async () => {
      mockConnected();
      mockGetAthleteSettings.mockRejectedValue(
        new Error('settings unavailable'),
      );
      mockZoneTwoHourToday();

      const { result } = await renderHookWithClient(() =>
        useUpcomingWorkouts(),
      );

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject([
          { workout: { blocks: [COGGAN_ZONE_2_BLOCK] } },
        ]),
      );
    });

    it('reads the athlete settings once and reuses them on a refetch', async () => {
      mockConnected();
      mockGetCalendarEvents.mockResolvedValue([]);

      const { result } = await renderHookWithClient(() =>
        useUpcomingWorkouts(),
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      await act(() => result.current.refetch());

      expect(mockGetAthleteSettings).toHaveBeenCalledTimes(1);
    });

    it("reads the athlete settings again after they failed, drawing the athlete's zones once they load", async () => {
      mockConnected();
      mockGetAthleteSettings
        .mockRejectedValueOnce(new Error('settings down'))
        .mockResolvedValue({ powerZones: ATHLETE_ZONES });
      mockZoneTwoHourToday();

      const { result } = await renderHookWithClient(() =>
        useUpcomingWorkouts(),
      );

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject([
          { workout: { blocks: [COGGAN_ZONE_2_BLOCK] } },
        ]),
      );
      await act(() => result.current.refetch());

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject([
          { workout: { blocks: [ATHLETE_ZONE_2_BLOCK] } },
        ]),
      );
      expect(mockGetAthleteSettings).toHaveBeenCalledTimes(2);
    });
  });

  it('is empty when connected but no events match', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'RACE',
        name: 'Race',
        start_date_local: '2026-07-25T08:00:00',
      },
    ]);

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.query.data).toEqual([]));
  });
});
