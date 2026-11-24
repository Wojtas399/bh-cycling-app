import {
  connectIntervals,
  disconnectIntervals,
  intervalsConnectionLoading,
} from '@/test-utils/intervalsConnection';

import {
  type UseCalendarRangeConfig,
  useCalendarRange,
} from '../useCalendarRange';
import { useToday } from '@/hooks/useToday';
import {
  type IntervalsActivity,
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import {
  addDays,
  endOfMonth,
  startOfMonth,
  toLocalDateString,
  toYearMonth,
} from '@/lib/localDate';
import { restoreDefaultFocus } from '@/test-utils/focus';
import {
  createTestQueryClient,
  renderHookWithClient,
} from '@/test-utils/queryClient';
import { type QueryClient, focusManager } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const mockUseToday = jest.mocked(useToday);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetActivities = jest.mocked(getActivities);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);

function event(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: `${toLocalDateString(new Date())}T08:00:00`,
    ...overrides,
  };
}

const monthConfig: UseCalendarRangeConfig = {
  startOf: startOfMonth,
  endOf: endOfMonth,
  monthsFor: anchor => [toYearMonth(anchor)],
  step: (anchor, direction) =>
    new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1),
};

const today = toLocalDateString(new Date());

const visibleMonthKey = intervalsKeys.month(
  'athlete-1',
  toYearMonth(new Date()),
);

const EMPTY_MONTH = { itemsByDate: {}, completedEventIds: [], notes: [] };

function ageVisibleMonth(client: QueryClient, ageMs: number) {
  client.setQueryData(visibleMonthKey, EMPTY_MONTH, {
    updatedAt: Date.now() - ageMs,
  });
}

function clientWithMonthFetched(ageMs: number) {
  const client = createTestQueryClient();

  ageVisibleMonth(client, ageMs);

  return client;
}

const SIX_MINUTES = 6 * 60_000;

function monthFetches(): number {
  return mockGetCalendarEvents.mock.calls.filter(
    ([, , params]) => params?.category === undefined,
  ).length;
}

describe('useCalendarRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToday.mockReturnValue(today);
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  afterEach(() => {
    restoreDefaultFocus();
    jest.useRealTimers();
  });

  it('opens on the range containing a starting date', async () => {
    disconnectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange({ ...monthConfig, startDate: new Date(2021, 1, 17) }),
    );

    expect(toLocalDateString(result.current.anchor)).toBe('2021-02-01');
  });

  it("opens on today's range without a starting date", async () => {
    disconnectIntervals();
    mockUseToday.mockReturnValue('2021-02-17');

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(toLocalDateString(result.current.anchor)).toBe('2021-02-01');
    expect(result.current.showsToday).toBe(true);
  });

  it('is unavailable and makes no API call when not connected', async () => {
    disconnectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('unavailable');
    expect(result.current.query.data).toBeUndefined();
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is loading while the connection state itself is resolving', async () => {
    intervalsConnectionLoading();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('loading');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is pending while the fetch is in flight', async () => {
    connectIntervals();
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('available');
    expect(result.current.query.isPending).toBe(true);
    expect(result.current.query.isError).toBe(false);
  });

  it('is an error when the month fails to load', async () => {
    connectIntervals();
    mockGetCalendarEvents.mockRejectedValue(new Error('network down'));

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.data).toBeUndefined();
  });

  it("has the visible month's workouts by date once loaded", async () => {
    connectIntervals();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toEqual([
      {
        kind: 'workout',
        workout: {
          id: 1,
          name: 'Sample workout',
          date: today,
          status: 'planned',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
    ]);
  });

  it("falls back to Coggan's zones and still shows the Workout when the athlete settings fail", async () => {
    connectIntervals();
    mockGetAthleteSettings.mockRejectedValue(new Error('settings unavailable'));
    mockGetCalendarEvents.mockResolvedValue([
      event({
        id: 1,
        workout_doc: {
          duration: 3600,
          steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
        },
      }),
    ]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toMatchObject([
      {
        workout: {
          blocks: [{ widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 }],
        },
      },
    ]);
  });

  it("surfaces the month's Races from its existing events call, with no new request", async () => {
    connectIntervals();
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE'
          ? []
          : [
              event({ id: 1, start_date_local: `${today}T06:00:00` }),
              event({
                id: 7,
                category: 'RACE_B',
                name: 'Maraton Kraków',
                type: 'MountainBikeRide',
                start_date_local: `${today}T10:30:00`,
              }),
            ],
    );

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toMatchObject([
      {
        kind: 'race',
        race: {
          id: 7,
          name: 'Maraton Kraków',
          priority: 'B',
          date: today,
          startTime: '10:30',
          sport: 'MountainBikeRide',
        },
      },
      { kind: 'workout', workout: { id: 1, status: 'planned' } },
    ]);
    expect(
      mockGetCalendarEvents.mock.calls.map(([, , params]) => params?.category),
    ).toEqual(expect.arrayContaining([undefined, 'NOTE']));
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it("fetches each month's Notes from 31 days before it to its last day", async () => {
    connectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const first = startOfMonth(new Date());

    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: toLocalDateString(addDays(first, -31)),
        newest: toLocalDateString(endOfMonth(first)),
        category: 'NOTE',
      },
      expect.anything(),
    );
  });

  it('has the Notes covering the visible month, one from the month before included', async () => {
    connectIntervals();
    const first = startOfMonth(new Date());
    const lastMonth = toLocalDateString(addDays(first, -3));
    const second = toLocalDateString(addDays(first, 2));

    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE'
          ? [
              event({
                id: 9,
                category: 'NOTE',
                name: 'Obóz',
                start_date_local: `${lastMonth}T00:00:00`,
                end_date_local: `${second}T00:00:00`,
              }),
            ]
          : [],
    );

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.notes).toMatchObject([
      { id: 9, name: 'Obóz', start: lastMonth, end: second },
    ]);
  });

  it('is an error when the Notes call fails', async () => {
    connectIntervals();
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) => {
        if (params?.category === 'NOTE') throw new Error('notes down');

        return [event({ id: 1 })];
      },
    );

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.data).toBeUndefined();
  });

  it('marks a workout completed when a paired activity is returned', async () => {
    connectIntervals();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 42 })]);
    mockGetActivities.mockResolvedValue([
      {
        id: 'a1',
        name: 'Ride',
        type: 'Ride',
        start_date_local: `${today}T08:10:00`,
        moving_time: 3600,
        distance: 30000,
        paired_event_id: 42,
      } satisfies IntervalsActivity,
    ]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toMatchObject([
      { workout: { status: 'completed' } },
    ]);
  });

  it('lists a Strava Activity, as the list returns it, on its day without pairing it', async () => {
    connectIntervals();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 42 })]);
    mockGetActivities.mockResolvedValue([
      {
        id: '20679555658',
        start_date_local: `${today}T18:00:00`,
        moving_time: 0,
        distance: 0,
      },
    ]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toEqual([
      {
        kind: 'workout',
        workout: {
          id: 42,
          name: 'Sample workout',
          date: today,
          status: 'planned',
          blocks: [],
          completedWithStravaActivity: false,
        },
      },
      {
        kind: 'activity',
        activity: { id: '20679555658', isStravaActivity: true, date: today },
      },
    ]);
  });

  it('shows a month already loaded at once when navigating back to it, with no new fetch', async () => {
    connectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    await act(async () => result.current.goToNext());
    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(monthFetches()).toBe(2);

    await act(async () => result.current.goToPrevious());

    expect(result.current.query.data).toBeDefined();
    expect(monthFetches()).toBe(2);
  });

  it('refetches a month that went stale while shown only once the app returns to the foreground', async () => {
    connectIntervals();
    focusManager.setFocused(false);

    const client = clientWithMonthFetched(0);

    await renderHookWithClient(() => useCalendarRange(monthConfig), {
      client,
    });

    await act(async () => ageVisibleMonth(client, SIX_MINUTES));
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();

    await act(async () => focusManager.setFocused(true));

    await waitFor(() => expect(monthFetches()).toBe(1));
  });

  it('does not refetch a fresh month when the app returns to the foreground', async () => {
    connectIntervals();
    focusManager.setFocused(false);

    const { result } = await renderHookWithClient(
      () => useCalendarRange(monthConfig),
      { client: clientWithMonthFetched(0) },
    );

    await act(async () => focusManager.setFocused(true));

    expect(result.current.query.data).toBeDefined();
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it("turns yesterday's planned workout into missed when today moves on, without a new request", async () => {
    connectIntervals();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result, rerender } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.itemsByDate[today]).toMatchObject([
      { workout: { status: 'planned' } },
    ]);

    mockUseToday.mockReturnValue(toLocalDateString(addDays(new Date(), 1)));
    await rerender({});

    await waitFor(() =>
      expect(result.current.query.data?.itemsByDate[today]).toMatchObject([
        { workout: { status: 'missed' } },
      ]),
    );
    expect(monthFetches()).toBe(1);
  });

  it('shows today on its month, not after navigating away, and again after coming back', async () => {
    connectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.showsToday).toBe(true);

    await act(async () => result.current.goToNext());
    expect(result.current.showsToday).toBe(false);

    await act(async () => result.current.goToPrevious());
    expect(result.current.showsToday).toBe(true);
  });

  it.each([
    ['an earlier', 'goToPrevious'],
    ['a later', 'goToNext'],
  ] as const)(
    "goes back to today's month from %s month",
    async (_, navigate) => {
      connectIntervals();

      const { result } = await renderHookWithClient(() =>
        useCalendarRange(monthConfig),
      );

      await act(async () => result.current[navigate]());
      await act(async () => result.current[navigate]());
      expect(result.current.showsToday).toBe(false);

      await act(async () => result.current.goToToday());

      expect(result.current.anchor).toEqual(startOfMonth(new Date()));
      expect(result.current.showsToday).toBe(true);
    },
  );

  it('stops showing today at midnight when the new day falls past the visible month', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 31, 23, 59, 30));
    mockUseToday.mockImplementation(
      jest.requireActual<{ useToday: typeof useToday }>('@/hooks/useToday')
        .useToday,
    );
    connectIntervals();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.showsToday).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(toLocalDateString(result.current.anchor)).toBe('2026-10-01');
    expect(result.current.showsToday).toBe(false);
  });
});
