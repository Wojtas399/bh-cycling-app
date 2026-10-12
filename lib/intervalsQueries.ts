import {
  ACTIVITY_FIELDS,
  PAIRING_WINDOW_DAYS,
  buildMonthWorkouts,
  endOfMonth,
  fromYearMonth,
} from './calendarWorkouts';
import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from './intervalsApi';
import { addDays, toLocalDateString } from './localDate';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';
import { getUpcomingWorkouts } from './upcomingWorkouts';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

/**
 * Every Intervals.icu query key starts with `intervalsKeys.all`, so the whole
 * athlete's data can be cancelled and removed by that prefix. The access token
 * is never part of a key — the `queryFn` closures capture it instead.
 */
export const intervalsKeys = {
  all: ['intervals'] as const,
  athleteSettings: (athleteId: string) =>
    [...intervalsKeys.all, athleteId, 'athleteSettings'] as const,
  /** `today` is the local `YYYY-MM-DD` the upcoming workouts are counted from. */
  upcoming: (athleteId: string, today: string) =>
    [...intervalsKeys.all, athleteId, 'upcoming', today] as const,
  /** Every Calendar month, the prefix the refresh control invalidates. */
  calendar: (athleteId: string) =>
    [...intervalsKeys.all, athleteId, 'calendar'] as const,
  /** `yearMonth` is the local `YYYY-MM` of the month. */
  month: (athleteId: string, yearMonth: string) =>
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

/** The athlete's power zones, resolved from their Intervals.icu settings. */
export function athleteSettingsQueryOptions(token: string, athleteId: string) {
  return queryOptions({
    queryKey: intervalsKeys.athleteSettings(athleteId),
    queryFn: async ({ signal }) =>
      resolveZoneConfig(await getAthleteSettings(token, { signal })),
  });
}

/** Workouts planned for `today` and the day after. */
export function upcomingQueryOptions(
  token: string,
  athleteId: string,
  today: string,
) {
  return queryOptions({
    queryKey: intervalsKeys.upcoming(athleteId, today),
    queryFn: async ({ signal, client }) => {
      const [year, month, day] = today.split('-').map(Number);
      const tomorrow = addDays(new Date(year, month - 1, day), 1);

      const [events, zoneConfig] = await Promise.all([
        getCalendarEvents(
          token,
          athleteId,
          { oldest: today, newest: toLocalDateString(tomorrow) },
          { signal },
        ),
        fetchZoneConfig(client, token, athleteId),
      ]);

      return getUpcomingWorkouts(events, new Date(), zoneConfig);
    },
  });
}

/**
 * One Calendar month's workouts by day, every day of it present. Activities
 * are fetched a pairing window past each edge, so a workout completed just
 * outside the month still reads as completed.
 */
export function monthQueryOptions(
  token: string,
  athleteId: string,
  yearMonth: string,
) {
  return queryOptions({
    queryKey: intervalsKeys.month(athleteId, yearMonth),
    queryFn: async ({ signal, client }) => {
      const first = fromYearMonth(yearMonth);
      const last = endOfMonth(first);

      const [events, activities, zoneConfig] = await Promise.all([
        getCalendarEvents(
          token,
          athleteId,
          { oldest: toLocalDateString(first), newest: toLocalDateString(last) },
          { signal },
        ),
        getActivities(
          token,
          athleteId,
          {
            oldest: toLocalDateString(addDays(first, -PAIRING_WINDOW_DAYS)),
            newest: toLocalDateString(addDays(last, PAIRING_WINDOW_DAYS)),
            fields: ACTIVITY_FIELDS,
          },
          { signal },
        ),
        fetchZoneConfig(client, token, athleteId),
      ]);

      return buildMonthWorkouts(
        first,
        events,
        activities,
        new Date(),
        zoneConfig,
      );
    },
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
  token: string,
  athleteId: string,
): Promise<ZoneConfig> {
  return client
    .fetchQuery(athleteSettingsQueryOptions(token, athleteId))
    .catch(() => resolveZoneConfig(null));
}
