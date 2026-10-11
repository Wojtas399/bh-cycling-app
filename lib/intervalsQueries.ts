import { getAthleteSettings, getCalendarEvents } from './intervalsApi';
import { addDays, toLocalDateString } from './localDate';
import { resolveZoneConfig } from './powerZones';
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
        // Custom zone boundaries only sharpen the colours of the profile, and
        // Coggan stands in for them well enough. Losing them must never cost
        // the athlete the list of workouts itself. A failed settings query
        // isn't cached, so the next fetch retries it.
        client
          .fetchQuery(athleteSettingsQueryOptions(token, athleteId))
          .catch(() => resolveZoneConfig(null)),
      ]);

      return getUpcomingWorkouts(events, new Date(), zoneConfig);
    },
  });
}
