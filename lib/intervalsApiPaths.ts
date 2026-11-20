import type { LocalDateString } from './localDate';

export const INTERVALS_API_BASE_URL = 'https://intervals.icu/api/v1';

const ATHLETE_ID_OF_THE_CALLER = '0';

export const INTERVALS_TOKEN_OWNER_PATH = `/athlete/${ATHLETE_ID_OF_THE_CALLER}`;

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

export function intervalsActivityPath(activityId: string): string {
  return `/activity/${activityId}`;
}

export function intervalsActivityMapPath(activityId: string): string {
  return `${intervalsActivityPath(activityId)}/map`;
}

export function intervalsWellnessRangePath(athleteId: string): string {
  return `/athlete/${athleteId}/wellness`;
}

export function intervalsWellnessPath(
  athleteId: string,
  date: LocalDateString,
): string {
  return `${intervalsWellnessRangePath(athleteId)}/${date}`;
}
