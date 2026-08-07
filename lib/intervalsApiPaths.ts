export const INTERVALS_API_BASE_URL = 'https://intervals.icu/api/v1';

/**
 * The athlete the access token belongs to. intervals.icu reads the athlete id
 * `0` as "whoever is calling", so settings can be read without knowing an id.
 */
export const INTERVALS_CURRENT_ATHLETE_PATH = '/athlete/0';

export function intervalsActivitiesPath(athleteId: string): string {
  return `/athlete/${athleteId}/activities`;
}

export function intervalsCalendarEventsPath(athleteId: string): string {
  return `/athlete/${athleteId}/events`;
}
