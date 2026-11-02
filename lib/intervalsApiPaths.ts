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

export function intervalsCalendarEventPath(
  athleteId: string,
  eventId: number,
): string {
  return `${intervalsCalendarEventsPath(athleteId)}/${eventId}`;
}

/** One Activity. Activity ids aren't scoped by athlete. */
export function intervalsActivityPath(activityId: string): string {
  return `/activity/${activityId}`;
}

/** An Activity's GPS track. */
export function intervalsActivityMapPath(activityId: string): string {
  return `${intervalsActivityPath(activityId)}/map`;
}

/** One day's Wellness Entry, by its local `YYYY-MM-DD` date. */
export function intervalsWellnessPath(athleteId: string, date: string): string {
  return `/athlete/${athleteId}/wellness/${date}`;
}
