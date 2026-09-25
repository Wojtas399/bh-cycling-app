import { useMonthlyCalendar } from '../useMonthlyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  clearCalendarCache,
  endOfMonth,
  startOfMonth,
} from '@/lib/calendarWorkouts';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import {
  type IntervalsActivity,
  IntervalsAuthError,
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { toLocalDateString } from '@/lib/localDate';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => {
  const actual = jest.requireActual('@/lib/intervalsApi');

  return {
    ...actual,
    getCalendarEvents: jest.fn(),
    getActivities: jest.fn(),
    getAthleteSettings: jest.fn(),
  };
});

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetActivities = getActivities as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;
const mockHandleIntervalsAuthError = handleIntervalsAuthError as jest.Mock;

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

function event(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  const now = new Date();

  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: `${toLocalDateString(now)}T08:00:00`,
    ...overrides,
  };
}

const now = new Date();
const currentMonthRange = {
  oldest: toLocalDateString(startOfMonth(now)),
  newest: toLocalDateString(endOfMonth(now)),
};

describe('useMonthlyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCalendarCache();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('is hidden and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHook(() => useMonthlyCalendar());

    expect(result.current.state.status).toBe('hidden');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is loading while the connection state itself is resolving', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHook(() => useMonthlyCalendar());

    expect(result.current.state.status).toBe('loading');
  });

  it('is loading while the fetch is in flight', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useMonthlyCalendar());

    expect(result.current.state.status).toBe('loading');
  });

  it('delegates to the shared auth-error handler on a 401 and hides', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockRejectedValue(new IntervalsAuthError());

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('hidden'));
    expect(mockHandleIntervalsAuthError).toHaveBeenCalledTimes(1);
  });

  it('hides on any other fetch error without calling the auth-error handler', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockRejectedValue(new Error('network down'));

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('hidden'));
    expect(mockHandleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('is ready with workouts grouped by date for the visible month', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const state = result.current.state;
    const today = toLocalDateString(now);

    expect(state.status === 'ready' && state.workoutsByDate[today]).toEqual([
      {
        id: 1,
        name: 'Sample workout',
        date: today,
        status: 'planned',
        blocks: [],
      },
    ]);
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining(currentMonthRange),
    );
    expect(mockGetActivities).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({
        ...currentMonthRange,
        fields: expect.any(String),
      }),
    );
  });

  it('marks a workout completed when a paired activity is returned', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([event({ id: 42 })]);
    mockGetActivities.mockResolvedValue([
      {
        id: 'a1',
        name: 'Ride',
        type: 'Ride',
        start_date_local: `${toLocalDateString(now)}T08:10:00`,
        moving_time: 3600,
        distance: 30000,
        paired_event_id: 42,
      } satisfies IntervalsActivity,
    ]);

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const state = result.current.state;
    const today = toLocalDateString(now);

    expect(
      state.status === 'ready' && state.workoutsByDate[today][0].status,
    ).toBe('completed');
  });

  it('does not refetch when navigating back to a month already fetched this session', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);

    await act(async () => result.current.goToNextMonth());
    await waitFor(() => expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    await act(async () => result.current.goToPreviousMonth());

    // Back to the already-fetched month: stays ready immediately, no new fetch.
    expect(result.current.state.status).toBe('ready');
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('refresh clears the cache, keeps old data visible with a refreshing flag, then reloads', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    let resolveSecondFetch: (
      value: IntervalsCalendarEvent[],
    ) => void = () => {};

    mockGetCalendarEvents.mockReturnValue(
      new Promise(resolve => {
        resolveSecondFetch = resolve;
      }),
    );

    await act(async () => result.current.refresh());

    const midState = result.current.state;

    expect(midState.status).toBe('ready');
    expect(midState.status === 'ready' && midState.refreshing).toBe(true);
    expect(
      midState.status === 'ready' &&
        midState.workoutsByDate[toLocalDateString(now)],
    ).toHaveLength(1);

    await act(async () => {
      resolveSecondFetch([event({ id: 2 })]);
    });

    await waitFor(() => {
      const state = result.current.state;

      expect(state.status === 'ready' && state.refreshing).toBe(false);
    });

    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('does not let a stale refresh overwrite a later month navigation', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([event({ id: 1 })]);

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    let resolveStaleRefresh: (
      value: IntervalsCalendarEvent[],
    ) => void = () => {};

    // Refresh starts an eager re-fetch of the current month that never
    // resolves until we tell it to, below.
    mockGetCalendarEvents.mockReturnValue(
      new Promise(resolve => {
        resolveStaleRefresh = resolve;
      }),
    );

    await act(async () => result.current.refresh());

    // The athlete navigates away before that refresh settles.
    mockGetCalendarEvents.mockResolvedValue([event({ id: 2 })]);

    await act(async () => result.current.goToNextMonth());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const nextMonth = result.current.month;
    const nextMonthReadyState = result.current.state;

    expect(
      nextMonthReadyState.status === 'ready' && nextMonthReadyState.refreshing,
    ).toBe(false);

    // The stale refresh now resolves — it must not clobber the navigated-to
    // month's state.
    await act(async () => {
      resolveStaleRefresh([event({ id: 3 })]);
    });

    expect(result.current.month).toEqual(nextMonth);
    expect(result.current.state).toEqual(nextMonthReadyState);
  });
});
