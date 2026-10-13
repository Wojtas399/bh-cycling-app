import {
  type UseCalendarRangeConfig,
  useCalendarRange,
} from '../useCalendarRange';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { endOfMonth, startOfMonth, toYearMonth } from '@/lib/calendarWorkouts';
import {
  type IntervalsActivity,
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { toLocalDateString } from '@/lib/localDate';
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
const mockGetActivities = getActivities as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

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

/**
 * `useCalendarRange` is range-shape agnostic; exercising it through the
 * month config is enough to cover its own logic (states, navigation,
 * refresh). `useMonthlyCalendar`/`useWeeklyCalendar` each get their own thin
 * test verifying only how they wire their config.
 */
const monthConfig: UseCalendarRangeConfig = {
  initialAnchor: () => startOfMonth(new Date()),
  startOf: startOfMonth,
  endOf: endOfMonth,
  monthsFor: anchor => [toYearMonth(anchor)],
  step: (anchor, direction) =>
    new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1),
};

const today = toLocalDateString(new Date());

describe('useCalendarRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('is unavailable and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('unavailable');
    expect(result.current.query.data).toBeUndefined();
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is loading while the connection state itself is resolving', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('loading');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is pending while the fetch is in flight', async () => {
    mockConnected();
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    expect(result.current.availability).toBe('available');
    expect(result.current.query.isPending).toBe(true);
    expect(result.current.query.isError).toBe(false);
  });

  it('is an error when the month fails to load', async () => {
    mockConnected();
    mockGetCalendarEvents.mockRejectedValue(new Error('network down'));

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.data).toBeUndefined();
  });

  it("has the visible month's workouts by date once loaded", async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(result.current.query.data?.[today]).toEqual([
      {
        id: 1,
        name: 'Sample workout',
        date: today,
        status: 'planned',
        blocks: [],
      },
    ]);
  });

  it('marks a workout completed when a paired activity is returned', async () => {
    mockConnected();
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
    expect(result.current.query.data?.[today][0].status).toBe('completed');
  });

  it('does not refetch when navigating back to a month already loaded', async () => {
    mockConnected();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    await act(async () => result.current.goToNext());
    await waitFor(() => expect(result.current.query.data).toBeDefined());
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);

    await act(async () => result.current.goToPrevious());

    // Back to the loaded month: its data is there at once, with no new fetch.
    expect(result.current.query.data).toBeDefined();
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('keeps the data visible while a refresh is in flight, then shows the new data', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    let resolveRefresh: (value: IntervalsCalendarEvent[]) => void = () => {};

    mockGetCalendarEvents.mockReturnValue(
      new Promise(resolve => {
        resolveRefresh = resolve;
      }),
    );

    await act(async () => result.current.refresh());

    expect(result.current.refreshing).toBe(true);
    expect(result.current.query.data?.[today].map(w => w.id)).toEqual([1]);

    await act(async () => {
      resolveRefresh([event({ id: 2 })]);
    });

    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.query.data?.[today].map(w => w.id)).toEqual([2]);
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('keeps the data when a refresh fails', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const before = result.current.query.data;

    mockGetCalendarEvents.mockRejectedValue(new Error('offline'));

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.refreshing).toBe(false));

    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
    expect(result.current.query.isError).toBe(false);
    expect(result.current.query.data).toEqual(before);
  });

  it('refetches a month that was refreshed away from when it is next shown', async () => {
    mockConnected();

    const { result } = await renderHookWithClient(() =>
      useCalendarRange(monthConfig),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());
    await act(async () => result.current.goToNext());
    await waitFor(() => expect(result.current.query.data).toBeDefined());

    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(3);

    await act(async () => result.current.goToPrevious());

    await waitFor(() => expect(mockGetCalendarEvents).toHaveBeenCalledTimes(4));
    // A background refetch shows the old data and isn't a user refresh.
    expect(result.current.query.data).toBeDefined();
    expect(result.current.refreshing).toBe(false);
  });
});
