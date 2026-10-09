import { useWeeklyCalendar } from '../useWeeklyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  clearCalendarCache,
  endOfWeek,
  fetchMonth,
  startOfWeek,
} from '@/lib/calendarWorkouts';
import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { addDays, toLocalDateString } from '@/lib/localDate';
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

/**
 * The shared race-guard/loading/refresh behavior is covered once, generically,
 * in useCalendarRange.test.ts. This suite only checks that useWeeklyCalendar
 * wires the week-shaped config (range functions, field names, nav step, and
 * the cross-view fetched-range cache) correctly.
 */
describe('useWeeklyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCalendarCache();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('exposes the visible week (Monday) and fetches its range', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const { result } = await renderHook(() => useWeeklyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const now = new Date();

    expect(toLocalDateString(result.current.week)).toBe(
      toLocalDateString(startOfWeek(now)),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({
        oldest: toLocalDateString(startOfWeek(now)),
        newest: toLocalDateString(endOfWeek(now)),
      }),
    );
  });

  it('goToNextWeek/goToPreviousWeek step by seven days', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const { result } = await renderHook(() => useWeeklyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const currentWeek = result.current.week;

    await act(async () => result.current.goToNextWeek());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(result.current.week).toEqual(addDays(currentWeek, 7));

    await act(async () => result.current.goToPreviousWeek());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(result.current.week).toEqual(currentWeek);
  });

  it('does not refetch a week whose dates a prior month fetch already covered', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const now = new Date();

    // Simulates the monthly view having already fetched the month(s) the
    // week the weekly view opens to falls in — two when it straddles a
    // month boundary.
    await fetchMonth('token-1', 'athlete-1', startOfWeek(now), now);
    await fetchMonth('token-1', 'athlete-1', endOfWeek(now), now);
    mockGetCalendarEvents.mockClear();
    mockGetActivities.mockClear();

    const { result } = await renderHook(() => useWeeklyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });
});
