import { useWeeklyCalendar } from '../useWeeklyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  toYearMonth,
} from '@/lib/calendarWorkouts';
import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { monthQueryOptions, selectMonthAsOf } from '@/lib/intervalsQueries';
import { addDays, toLocalDateString } from '@/lib/localDate';
import { createQueryClient } from '@/lib/queryClient';
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

const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetActivities = getActivities as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

/**
 * The shared loading/refresh behavior is covered once, generically, in
 * useCalendarRange.test.ts. This suite only checks that useWeeklyCalendar
 * wires the week-shaped config (range, the months it touches, nav step).
 */
describe('useWeeklyCalendar', () => {
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

  it('exposes the visible week (Monday) and its seven days, fetching the whole months it touches', async () => {
    const { result } = await renderHookWithClient(() => useWeeklyCalendar());

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const now = new Date();
    const monday = startOfWeek(now);

    expect(toLocalDateString(result.current.week)).toBe(
      toLocalDateString(monday),
    );
    expect(Object.keys(result.current.query.data ?? {})).toEqual(
      Array.from({ length: 7 }, (_, index) =>
        toLocalDateString(addDays(monday, index)),
      ),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: toLocalDateString(startOfMonth(monday)),
        newest: toLocalDateString(endOfMonth(monday)),
      },
      expect.anything(),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: toLocalDateString(startOfMonth(endOfWeek(now))),
        newest: toLocalDateString(endOfMonth(endOfWeek(now))),
      },
      expect.anything(),
    );
  });

  it('goToNextWeek/goToPreviousWeek step by seven days', async () => {
    const { result } = await renderHookWithClient(() => useWeeklyCalendar());

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const currentWeek = result.current.week;

    await act(async () => result.current.goToNextWeek());
    await waitFor(() => expect(result.current.query.data).toBeDefined());

    expect(result.current.week).toEqual(addDays(currentWeek, 7));

    await act(async () => result.current.goToPreviousWeek());

    expect(result.current.week).toEqual(currentWeek);
  });

  it('does not fetch a week whose months are already loaded', async () => {
    const now = new Date();
    const client = createQueryClient();

    // As if the monthly view had loaded the month(s) this week falls in.
    for (const day of [startOfWeek(now), endOfWeek(now)]) {
      await client.fetchQuery(
        monthQueryOptions(
          CREDENTIALS,
          toYearMonth(day),
          selectMonthAsOf(toLocalDateString(now)),
        ),
      );
    }

    mockGetCalendarEvents.mockClear();

    const { result } = await renderHookWithClient(() => useWeeklyCalendar(), {
      client,
    });

    expect(result.current.query.data).toBeDefined();
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });
});
