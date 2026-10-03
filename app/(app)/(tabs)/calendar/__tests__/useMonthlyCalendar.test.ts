import { useMonthlyCalendar } from '../useMonthlyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  clearCalendarCache,
  endOfMonth,
  startOfMonth,
} from '@/lib/calendarWorkouts';
import {
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
 * in useCalendarRange.test.ts. This suite only checks that useMonthlyCalendar
 * wires the month-shaped config (range functions, field names, nav step)
 * correctly.
 */
describe('useMonthlyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCalendarCache();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('exposes the visible calendar month and fetches its range', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const now = new Date();

    expect(result.current.month).toEqual(startOfMonth(now));
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({
        oldest: toLocalDateString(startOfMonth(now)),
        newest: toLocalDateString(endOfMonth(now)),
      }),
    );
  });

  it('goToNextMonth/goToPreviousMonth step by calendar month', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });

    const { result } = await renderHook(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const currentMonth = result.current.month;

    await act(async () => result.current.goToNextMonth());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(result.current.month).toEqual(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );

    await act(async () => result.current.goToPreviousMonth());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(result.current.month).toEqual(currentMonth);
  });
});
