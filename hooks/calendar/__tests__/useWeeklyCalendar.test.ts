import { connectIntervals } from '@/test-utils/intervalsConnection';

import { useWeeklyCalendar } from '../useWeeklyCalendar';
import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import {
  intervalsKeys,
  monthQueryOptions,
  selectMonthAsOf,
} from '@/lib/intervalsQueries';
import {
  addDays,
  endOfWeek,
  startOfWeek,
  toLocalDateString,
  toYearMonth,
} from '@/lib/localDate';
import { createQueryClient } from '@/lib/queryClient';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetActivities = jest.mocked(getActivities);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);

describe('useWeeklyCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectIntervals();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  it('exposes the visible week (Monday) and its seven days, fetching the whole months it touches', async () => {
    const { result, client } = await renderHookWithClient(() =>
      useWeeklyCalendar(),
    );

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

    for (const day of [monday, endOfWeek(now)]) {
      expect(
        client.getQueryData(intervalsKeys.month('athlete-1', toYearMonth(day))),
      ).toBeDefined();
    }
  });

  it('opens on the week containing a starting date, fetching the months it touches', async () => {
    const wednesdayOfTheWeekAcrossNewYear2021 = new Date(2020, 11, 30);
    const { result } = await renderHookWithClient(() =>
      useWeeklyCalendar(wednesdayOfTheWeekAcrossNewYear2021),
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

  it("shows a Race in a week across two months once, though it falls in December's pairing window as well as in January, so both months' events calls return it", async () => {
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) =>
        params?.category === 'NOTE'
          ? []
          : [
              {
                id: 7,
                category: 'RACE_A',
                name: 'Noworoczny Maraton',
                type: 'Ride',
                start_date_local: '2021-01-02T00:00:00',
              },
            ],
    );

    const { result } = await renderHookWithClient(() =>
      useWeeklyCalendar(new Date(2020, 11, 30)),
    );

    await waitFor(() => expect(result.current.query.data).toBeDefined());

    const itemsByDate = result.current.query.data?.itemsByDate ?? {};

    expect(itemsByDate['2021-01-02']).toEqual([
      {
        kind: 'race',
        race: {
          id: 7,
          name: 'Noworoczny Maraton',
          priority: 'A',
          date: '2021-01-02',
          sport: 'Ride',
        },
      },
    ]);
    expect(Object.values(itemsByDate).flat()).toHaveLength(1);
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

  it('shows today in a week that crosses into the next month, on one of its later days', async () => {
    const sundayEndingAWeekBegunInOctober = new Date(2026, 10, 1, 12);

    jest.useFakeTimers();
    jest.setSystemTime(sundayEndingAWeekBegunInOctober);

    const { result } = await renderHookWithClient(() => useWeeklyCalendar());

    expect(toLocalDateString(result.current.week)).toBe('2026-10-26');
    expect(result.current.showsToday).toBe(true);
  });

  it("goToToday goes back to today's week", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 30, 12));

    const { result } = await renderHookWithClient(() =>
      useWeeklyCalendar(new Date(2026, 9, 5)),
    );

    expect(result.current.showsToday).toBe(false);

    await act(async () => result.current.goToToday());

    expect(toLocalDateString(result.current.week)).toBe('2026-10-26');
    expect(result.current.showsToday).toBe(true);
  });

  it('does not fetch a week whose months the monthly view has already loaded', async () => {
    const now = new Date();
    const client = createQueryClient();

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
