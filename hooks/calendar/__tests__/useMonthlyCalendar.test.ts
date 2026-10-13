import { useMonthlyCalendar } from '../useMonthlyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { endOfMonth, startOfMonth } from '@/lib/calendarWorkouts';
import {
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

/**
 * The shared loading/refresh behavior is covered once, generically, in
 * useCalendarRange.test.ts. This suite only checks that useMonthlyCalendar
 * wires the month-shaped config (range, months, nav step) correctly.
 */
describe('useMonthlyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIntervalsConnection.mockReturnValue({
      isConnected: true,
      athleteName: null,
      athleteId: 'athlete-1',
      accessToken: 'token-1',
      loading: false,
    });
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('exposes the visible calendar month and fetches it', async () => {
    const { result } = await renderHookWithClient(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const now = new Date();

    expect(result.current.month).toEqual(startOfMonth(now));
    expect(Object.keys(result.current.query.data ?? {})).toHaveLength(
      endOfMonth(now).getDate(),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: toLocalDateString(startOfMonth(now)),
        newest: toLocalDateString(endOfMonth(now)),
      },
      expect.anything(),
    );
  });

  it('goToNextMonth/goToPreviousMonth step by calendar month', async () => {
    const { result } = await renderHookWithClient(() => useMonthlyCalendar());

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const currentMonth = result.current.month;

    await act(async () => result.current.goToNextMonth());
    await waitFor(() => expect(result.current.query.data).toBeDefined());

    expect(result.current.month).toEqual(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );

    await act(async () => result.current.goToPreviousMonth());

    expect(result.current.month).toEqual(currentMonth);
  });
});
