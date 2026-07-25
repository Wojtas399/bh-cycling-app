export const INTERVALS_API_BASE_URL = 'https://intervals.icu/api/v1';

export function intervalsActivitiesPath(athleteId: string): string {
  return `/athlete/${athleteId}/activities`;
}

export function intervalsCalendarEventsPath(athleteId: string): string {
  return `/athlete/${athleteId}/events`;
}
