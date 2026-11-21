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

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;
const mockGetActivities = getActivities as jest.Mock;

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
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

function todayEvent(): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Intervals',
    start_date_local: `${toLocalDateString(new Date())}T08:00:00`,
  };
}

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

  it("caches today's items under the athlete and today's date", async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([todayEvent()]);

    const { result, client } = await renderHookWithClient(() =>
      useUpcomingWorkouts(),
    );

    await waitFor(() =>
      expect(result.current.query.data).toEqual([
        {
          kind: 'workout',
          dayLabel: 'today',
          workout: {
            id: 1,
            name: 'Intervals',
            date: toLocalDateString(new Date()),
            status: 'planned',
            blocks: [],
            completedWithStravaActivity: false,
          },
        },
      ]),
    );
    expect(
      client.getQueryData([
        'intervals',
        'athlete-1',
        'upcoming',
        toLocalDateString(new Date()),
      ]),
    ).toBe(result.current.query.data);
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

  it("lists today's Race first, from the events call it already makes", async () => {
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
      async (_token, _athlete, params: { category?: string }) =>
        params.category === 'NOTE' ? [] : [todayEvent(), race],
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
      async (_token, _athlete, params: { category?: string }) =>
        params.category === 'NOTE' ? [note] : [todayEvent()],
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

    mockGetCalendarEvents.mockResolvedValue([todayEvent()]);
    mockGetActivities.mockResolvedValue([
      { id: '20679555658', start_date_local: `${today}T18:00:00` },
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
      async (_token, _athlete, params: { category?: string }) => {
        if (params.category === 'NOTE') throw new Error('notes down');

        return [todayEvent()];
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
      async (_token, _athlete, params: { category?: string }) =>
        params.category === 'NOTE' ? [] : [todayEvent()],
    );
    await act(() => result.current.refetch());

    expect(client.getQueryData(upcomingKey)).toMatchObject([
      { kind: 'workout', workout: { id: 1 } },
    ]);
    expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(otherUpdatedAt);
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
