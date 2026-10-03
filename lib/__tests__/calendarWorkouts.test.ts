import {
  clearCalendarCache,
  endOfWeek,
  fetchMonth,
  fetchWeek,
  getWorkoutsByDate,
  isMonthFetched,
  startOfMonth,
  startOfWeek,
} from '../calendarWorkouts';
import {
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '../intervalsApi';
import { toLocalDateString } from '../localDate';

jest.mock('../intervalsApi', () => ({
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetActivities = getActivities as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

const NOW = new Date(2026, 5, 15, 12);
const MONTH = startOfMonth(NOW);

function event(id: number, date: string): IntervalsCalendarEvent {
  return {
    id,
    category: 'WORKOUT',
    name: `Workout ${id}`,
    start_date_local: `${date}T08:00:00`,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(res => {
    resolve = res;
  });

  return { promise, resolve };
}

function workoutIds(): number[] {
  return Object.values(getWorkoutsByDate(MONTH, new Date(2026, 5, 30)))
    .flat()
    .map(workout => workout.id);
}

describe('calendarWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCalendarCache();
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockResolvedValue([]);
    mockGetActivities.mockResolvedValue([]);
  });

  it('does not let a fetch in flight during a clear repopulate the cache', async () => {
    const pending = deferred<IntervalsCalendarEvent[]>();

    mockGetCalendarEvents.mockReturnValue(pending.promise);

    const fetch = fetchMonth('token', 'athlete-1', NOW, NOW);

    clearCalendarCache();
    pending.resolve([event(1, '2026-06-10')]);
    await fetch;

    expect(isMonthFetched(NOW, 'athlete-1')).toBe(false);
    expect(workoutIds()).toEqual([]);
  });

  it("drops one athlete's cache when another athlete fetches", async () => {
    mockGetCalendarEvents.mockResolvedValue([event(1, '2026-06-10')]);
    await fetchMonth('token-a', 'athlete-a', NOW, NOW);

    expect(isMonthFetched(NOW, 'athlete-a')).toBe(true);
    expect(isMonthFetched(NOW, 'athlete-b')).toBe(false);

    mockGetCalendarEvents.mockResolvedValue([event(2, '2026-06-11')]);
    await fetchMonth('token-b', 'athlete-b', NOW, NOW);

    expect(workoutIds()).toEqual([2]);
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it('retries the athlete settings after a failed lookup instead of pinning the fallback', async () => {
    mockGetAthleteSettings.mockRejectedValueOnce(new Error('timeout'));
    await fetchMonth('token', 'athlete-1', NOW, NOW);

    await fetchMonth('token', 'athlete-1', NOW, NOW, { force: true });
    await fetchMonth('token', 'athlete-1', NOW, NOW, { force: true });

    // Failed once, succeeded on the second fetch, then served from cache.
    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(2);
  });

  it('queries activities beyond the range so cross-boundary pairings are seen', async () => {
    await fetchMonth('token', 'athlete-1', NOW, NOW);

    expect(mockGetActivities).toHaveBeenCalledWith(
      'token',
      'athlete-1',
      expect.objectContaining({ oldest: '2026-05-25', newest: '2026-07-07' }),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token',
      'athlete-1',
      expect.objectContaining({ oldest: '2026-06-01', newest: '2026-06-30' }),
    );
  });

  it('shares one request between identical concurrent fetches', async () => {
    await Promise.all([
      fetchMonth('token', 'athlete-1', NOW, NOW),
      fetchMonth('token', 'athlete-1', NOW, NOW),
    ]);

    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);
  });

  it('keeps old data until a forced refresh succeeds, then replaces it', async () => {
    mockGetCalendarEvents.mockResolvedValue([event(1, '2026-06-10')]);
    await fetchMonth('token', 'athlete-1', NOW, NOW);

    mockGetCalendarEvents.mockRejectedValue(new Error('offline'));
    await expect(
      fetchMonth('token', 'athlete-1', NOW, NOW, { force: true }),
    ).rejects.toThrow('offline');
    expect(workoutIds()).toEqual([1]);

    mockGetCalendarEvents.mockResolvedValue([event(2, '2026-06-12')]);
    await fetchMonth('token', 'athlete-1', NOW, NOW, { force: true });
    expect(workoutIds()).toEqual([2]);
  });

  describe('week boundaries', () => {
    it("spans Monday to Sunday regardless of the anchor's time of day", () => {
      const lateThursday = new Date(2026, 5, 18, 23, 45);

      expect(toLocalDateString(startOfWeek(lateThursday))).toBe('2026-06-15');
      expect(toLocalDateString(endOfWeek(lateThursday))).toBe('2026-06-21');
      expect(startOfWeek(lateThursday).getHours()).toBe(0);
    });

    it('caches all seven days of a week', async () => {
      await fetchWeek('token', 'athlete-1', new Date(2026, 5, 18, 2, 30), NOW);

      expect(
        Object.keys(
          getWorkoutsByDate(
            startOfWeek(new Date(2026, 5, 18)),
            endOfWeek(new Date(2026, 5, 18)),
          ),
        ),
      ).toHaveLength(7);
    });
  });
});
