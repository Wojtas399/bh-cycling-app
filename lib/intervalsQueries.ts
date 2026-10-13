import {
  ACTIVITY_FIELDS,
  PAIRING_WINDOW_DAYS,
  type StoredMonth,
  type WorkoutsByDate,
  type YearMonth,
  buildMonthWorkouts,
  endOfMonth,
  fromYearMonth,
  withWorkoutStatuses,
} from './calendarWorkouts';
import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';
import { getUpcomingWorkouts } from './upcomingWorkouts';
import {
  type QueryClient,
  queryOptions,
  skipToken,
} from '@tanstack/react-query';

/** What every Intervals.icu request needs: who to ask about, and the token. */
export interface IntervalsCredentials {
  accessToken: string;
  athleteId: string;
}

/**
 * Every Intervals.icu query key starts with `intervalsKeys.all`, so all of it
 * can be cancelled and removed by that prefix. The access token is never part
 * of a key — the `queryFn` closures capture it instead. The athlete id is
 * `undefined` only in the key of a query skipped for want of credentials.
 */
export const intervalsKeys = {
  all: ['intervals'] as const,
  /** Everything for one athlete, the prefix the refresh control invalidates. */
  athlete: (athleteId: string | undefined) =>
    [...intervalsKeys.all, athleteId] as const,
  athleteSettings: (athleteId: string) =>
    [...intervalsKeys.athlete(athleteId), 'athleteSettings'] as const,
  /** `today` is the date the upcoming workouts are counted from. */
  upcoming: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'upcoming', today] as const,
  /** Every Calendar month. */
  calendar: (athleteId: string | undefined) =>
    [...intervalsKeys.athlete(athleteId), 'calendar'] as const,
  month: (athleteId: string | undefined, yearMonth: YearMonth) =>
    [...intervalsKeys.calendar(athleteId), 'month', yearMonth] as const,
};

/**
 * Cancels every Intervals.icu query, aborting its request in flight, and then
 * drops them all, so a late response can never refill the cache.
 */
export async function removeIntervalsQueries(
  client: QueryClient,
): Promise<void> {
  await client.cancelQueries({ queryKey: intervalsKeys.all });
  client.removeQueries({ queryKey: intervalsKeys.all });
}

/**
 * How a month and the upcoming workouts stay fresh: stale after 5 minutes,
 * then refetched when shown again or when the app returns to the foreground.
 */
const WORKOUTS_FRESHNESS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: true,
} as const;

/**
 * The athlete's power zones, resolved from their Intervals.icu settings. They
 * rarely change, so only a refresh fetches them again.
 */
export function athleteSettingsQueryOptions({
  accessToken,
  athleteId,
}: IntervalsCredentials) {
  return queryOptions({
    queryKey: intervalsKeys.athleteSettings(athleteId),
    queryFn: async ({ signal }) =>
      resolveZoneConfig(await getAthleteSettings(accessToken, { signal })),
    staleTime: Infinity,
  });
}

/**
 * Workouts planned for `today` and the day after. Skipped while there are no
 * credentials.
 */
export function upcomingQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
) {
  return queryOptions({
    queryKey: intervalsKeys.upcoming(credentials?.athleteId, today),
    queryFn: credentials
      ? async ({ signal, client }) => {
          const tomorrow = addDays(fromLocalDateString(today), 1);

          const [events, zoneConfig] = await Promise.all([
            getCalendarEvents(
              credentials.accessToken,
              credentials.athleteId,
              { oldest: today, newest: toLocalDateString(tomorrow) },
              { signal },
            ),
            fetchZoneConfig(client, credentials),
          ]);

          return getUpcomingWorkouts(events, new Date(), zoneConfig);
        }
      : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/** Derives a stored month's Workout Statuses for display. */
export type MonthSelect = (month: StoredMonth) => WorkoutsByDate;

/**
 * The month `select` deriving each Workout Status as of `today`. Callers keep
 * it referentially stable per `today`, so a month's selected result is only
 * recomputed when the data or the day changes.
 */
export function selectMonthAsOf(today: LocalDateString): MonthSelect {
  return month => withWorkoutStatuses(month, today);
}

/**
 * One Calendar month's workouts by day, every day of it present. Activities
 * are fetched a pairing window past each edge, so a workout completed just
 * outside the month still reads as completed. The query stores the workouts
 * without a status; `select` (see `selectMonthAsOf`) derives each Workout
 * Status, so a planned workout turns missed at midnight without a fetch.
 * Skipped while there are no credentials.
 */
export function monthQueryOptions(
  credentials: IntervalsCredentials | null,
  yearMonth: YearMonth,
  select: MonthSelect,
) {
  return queryOptions({
    queryKey: intervalsKeys.month(credentials?.athleteId, yearMonth),
    queryFn: credentials
      ? async ({ signal, client }) => {
          const first = fromYearMonth(yearMonth);
          const last = endOfMonth(first);

          const [events, activities, zoneConfig] = await Promise.all([
            getCalendarEvents(
              credentials.accessToken,
              credentials.athleteId,
              {
                oldest: toLocalDateString(first),
                newest: toLocalDateString(last),
              },
              { signal },
            ),
            getActivities(
              credentials.accessToken,
              credentials.athleteId,
              {
                oldest: toLocalDateString(addDays(first, -PAIRING_WINDOW_DAYS)),
                newest: toLocalDateString(addDays(last, PAIRING_WINDOW_DAYS)),
                fields: ACTIVITY_FIELDS,
              },
              { signal },
            ),
            fetchZoneConfig(client, credentials),
          ]);

          return buildMonthWorkouts(first, events, activities, zoneConfig);
        }
      : skipToken,
    select,
    ...WORKOUTS_FRESHNESS,
  });
}

/**
 * Custom zone boundaries only sharpen the colours of a profile, and Coggan
 * stands in for them well enough. Losing them must never cost the athlete the
 * workouts themselves. A failed settings query isn't cached, so the next fetch
 * retries it.
 */
function fetchZoneConfig(
  client: QueryClient,
  credentials: IntervalsCredentials,
): Promise<ZoneConfig> {
  return client
    .fetchQuery(athleteSettingsQueryOptions(credentials))
    .catch(() => resolveZoneConfig(null));
}
