import { useWeeklyCalendar } from '../useWeeklyCalendar';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  endOfMonth,
  endOfWeek,
  pairingWindow,
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
    expect(Object.keys(result.current.query.data?.itemsByDate ?? {})).toEqual(
      Array.from({ length: 7 }, (_, index) =>
        toLocalDateString(addDays(monday, index)),
      ),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      pairingWindow(startOfMonth(monday), endOfMonth(monday)),
      expect.anything(),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      pairingWindow(startOfMonth(endOfWeek(now)), endOfMonth(endOfWeek(now))),
      expect.anything(),
    );
  });

  it('opens on the week containing a starting date, fetching the months it touches', async () => {
    // Wed 30 Dec 2020, in the week of Mon 28 Dec 2020 – Sun 3 Jan 2021.
    const { result } = await renderHookWithClient(() =>
      useWeeklyCalendar(new Date(2020, 11, 30)),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    expect(toLocalDateString(result.current.week)).toBe('2020-12-28');
    expect(Object.keys(result.current.query.data?.itemsByDate ?? {})).toEqual([
      '2020-12-28',
      '2020-12-29',
      '2020-12-30',
      '2020-12-31',
      '2021-01-01',
      '2021-01-02',
      '2021-01-03',
    ]);
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2020-11-24', newest: '2021-01-07' },
      expect.anything(),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      { oldest: '2020-12-25', newest: '2021-02-07' },
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
