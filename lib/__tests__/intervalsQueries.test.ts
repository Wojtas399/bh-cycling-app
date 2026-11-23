import { buildActivityDetails } from '../activityDetails';
import {
  activityDetailsQueryOptions,
  athleteSettingsQueryOptions,
  fitnessQueryOptions,
  intervalsKeys,
  monthQueryOptions,
  nextRaceQueryOptions,
  noteDetailsQueryOptions,
  raceQueryOptions,
  routeQueryOptions,
  selectMonthAsOf,
  selectWorkoutDetailsAsOf,
  todayQueryOptions,
  upcomingQueryOptions,
  workoutDetailsQueryOptions,
} from '../intervalsQueries';
import { getUpcomingItems } from '../upcomingWorkouts';
import { skipToken } from '@tanstack/react-query';

const TODAY = '2026-02-11';
const CREDENTIALS = { accessToken: 'token-1', athleteId: 'athlete-1' };

describe('intervalsKeys', () => {
  it('nests every key under the intervals prefix and the athlete', () => {
    expect(intervalsKeys.all).toEqual(['intervals']);
    expect(intervalsKeys.athlete('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
    ]);
    expect(intervalsKeys.athleteSettings('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
      'athleteSettings',
    ]);
    expect(intervalsKeys.upcoming('athlete-1', '2026-10-11')).toEqual([
      'intervals',
      'athlete-1',
      'upcoming',
      '2026-10-11',
    ]);
    expect(intervalsKeys.calendar('athlete-1')).toEqual([
      'intervals',
      'athlete-1',
      'calendar',
    ]);
    expect(intervalsKeys.month('athlete-1', '2026-06')).toEqual([
      'intervals',
      'athlete-1',
      'calendar',
      'month',
      '2026-06',
    ]);
    expect(intervalsKeys.route('athlete-1', 'i42')).toEqual([
      'intervals',
      'athlete-1',
      'route',
      'i42',
    ]);
    expect(intervalsKeys.activity('athlete-1', 'i42')).toEqual([
      'intervals',
      'athlete-1',
      'activity',
      'i42',
    ]);
  });
});

describe('query keys', () => {
  it.each([
    ['the athlete settings', athleteSettingsQueryOptions(CREDENTIALS).queryKey],
    [
      'the upcoming items',
      upcomingQueryOptions(CREDENTIALS, TODAY, stored =>
        getUpcomingItems(stored, TODAY),
      ).queryKey,
    ],
    ['the next Race', nextRaceQueryOptions(CREDENTIALS, TODAY).queryKey],
    ["today's Wellness Entry", todayQueryOptions(CREDENTIALS, TODAY).queryKey],
    ['the Fitness year', fitnessQueryOptions(CREDENTIALS, TODAY).queryKey],
    [
      'a month',
      monthQueryOptions(CREDENTIALS, '2026-02', selectMonthAsOf(TODAY))
        .queryKey,
    ],
    [
      "a Workout's details",
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ).queryKey,
    ],
    ['a Note', noteDetailsQueryOptions(CREDENTIALS, 42).queryKey],
    [
      "an Activity's details",
      activityDetailsQueryOptions(CREDENTIALS, 'i42', buildActivityDetails)
        .queryKey,
    ],
    ['a paired Race', raceQueryOptions(CREDENTIALS, 42).queryKey],
    ['a Route', routeQueryOptions(CREDENTIALS, 'i42').queryKey],
  ])(
    "keys %s under the athlete's prefix, never by the access token",
    (_, queryKey) => {
      expect(queryKey.slice(0, 2)).toEqual(['intervals', 'athlete-1']);
      expect(JSON.stringify(queryKey)).not.toContain(CREDENTIALS.accessToken);
    },
  );

  it('keys a query skipped for want of credentials under no athlete', () => {
    expect(athleteSettingsQueryOptions(null).queryKey).toEqual([
      'intervals',
      undefined,
      'athleteSettings',
    ]);
  });

  it('keys a query skipped for want of an id under a null id', () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, null, buildActivityDetails)
        .queryKey,
    ).toEqual(['intervals', 'athlete-1', 'activity', null]);
    expect(raceQueryOptions(CREDENTIALS, null).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'race',
      null,
    ]);
    expect(routeQueryOptions(CREDENTIALS, null).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'route',
      null,
    ]);
  });
});

describe('freshness', () => {
  const FIVE_MINUTES = 5 * 60_000;

  it('keeps the athlete settings fresh for the whole session', () => {
    expect(athleteSettingsQueryOptions(CREDENTIALS).staleTime).toBe(Infinity);
  });

  it('lets the upcoming workouts go stale after 5 minutes and refetch on focus', () => {
    const options = upcomingQueryOptions(CREDENTIALS, '2026-10-11', stored =>
      getUpcomingItems(stored, '2026-10-11'),
    );

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it('lets a month go stale after 5 minutes and refetch on focus', () => {
    const options = monthQueryOptions(
      CREDENTIALS,
      '2026-06',
      selectMonthAsOf('2026-06-15'),
    );

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it("lets an Activity's details go stale after 5 minutes and refetch on focus", () => {
    const options = activityDetailsQueryOptions(
      CREDENTIALS,
      'i42',
      buildActivityDetails,
    );

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it('lets the Fitness year go stale after 5 minutes and refetch on focus', () => {
    const options = fitnessQueryOptions(CREDENTIALS, '2026-11-06');

    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });

  it.each([
    ['the next Race', nextRaceQueryOptions(CREDENTIALS, TODAY)],
    ["today's Wellness Entry", todayQueryOptions(CREDENTIALS, TODAY)],
    [
      "a Workout's details",
      workoutDetailsQueryOptions(
        CREDENTIALS,
        42,
        selectWorkoutDetailsAsOf(42, TODAY),
      ),
    ],
    ['a Note', noteDetailsQueryOptions(CREDENTIALS, 42)],
    ['a paired Race', raceQueryOptions(CREDENTIALS, 42)],
  ])('lets %s go stale after 5 minutes and refetch on focus', (_, options) => {
    expect(options.staleTime).toBe(FIVE_MINUTES);
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});

describe('fitnessQueryOptions', () => {
  it('is skipped without credentials', () => {
    expect(fitnessQueryOptions(null, '2026-11-06').queryFn).toBe(skipToken);
  });
});

describe('activityDetailsQueryOptions', () => {
  it("keys the Activity by its id under the athlete's prefix", () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, 'i42', buildActivityDetails)
        .queryKey,
    ).toEqual(['intervals', 'athlete-1', 'activity', 'i42']);
  });

  it('is skipped without credentials', () => {
    expect(
      activityDetailsQueryOptions(null, 'i42', buildActivityDetails).queryFn,
    ).toBe(skipToken);
  });

  it('is skipped without an Activity id', () => {
    expect(
      activityDetailsQueryOptions(CREDENTIALS, null, buildActivityDetails)
        .queryFn,
    ).toBe(skipToken);
  });
});

describe('routeQueryOptions', () => {
  it("keys the Route by the Activity id under the athlete's prefix", () => {
    expect(routeQueryOptions(CREDENTIALS, 'i42').queryKey).toEqual([
      'intervals',
      'athlete-1',
      'route',
      'i42',
    ]);
  });

  it('is skipped without an Activity id', () => {
    expect(routeQueryOptions(CREDENTIALS, null).queryFn).toBe(skipToken);
  });

  it('is skipped without credentials', () => {
    expect(routeQueryOptions(null, 'i42').queryFn).toBe(skipToken);
  });

  it('keeps a loaded Route fresh forever', () => {
    expect(routeQueryOptions(CREDENTIALS, 'i42').staleTime).toBe(Infinity);
  });
});

describe('noteDetailsQueryOptions', () => {
  it("keys the Note by its event id under the athlete's prefix", () => {
    expect(noteDetailsQueryOptions(CREDENTIALS, 7).queryKey).toEqual([
      'intervals',
      'athlete-1',
      'note',
      7,
    ]);
  });

  it('is skipped without credentials', () => {
    expect(noteDetailsQueryOptions(null, 7).queryFn).toBe(skipToken);
  });
});

describe('athleteSettingsQueryOptions', () => {
  it('is skipped without credentials', () => {
    expect(athleteSettingsQueryOptions(null).queryFn).toBe(skipToken);
  });
});
