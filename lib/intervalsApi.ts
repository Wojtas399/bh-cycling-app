import {
  INTERVALS_API_BASE_URL,
  INTERVALS_CURRENT_ATHLETE_PATH,
  intervalsActivitiesPath,
  intervalsCalendarEventsPath,
} from './intervalsApiPaths';
import type { AthleteZoneSettings } from './powerZones';
import type { WorkoutStep } from './workoutProfile';

export class IntervalsAuthError extends Error {
  constructor(message = 'Intervals.icu access token is invalid or expired.') {
    super(message);
    this.name = 'IntervalsAuthError';
  }
}

export class IntervalsApiError extends Error {
  status: number;

  constructor(status: number, message = 'Intervals.icu API request failed.') {
    super(message);
    this.name = 'IntervalsApiError';
    this.status = status;
  }
}

export interface IntervalsDateRangeParams {
  oldest?: string;
  newest?: string;
}

export interface IntervalsActivity {
  id: string;
  name: string;
  type: string;
  start_date_local: string;
  moving_time: number;
  distance: number;
  icu_training_load?: number;
}

export interface IntervalsWorkoutDoc {
  duration?: number;
  /** The workout's efforts in time order, with repeats already expanded. */
  steps?: WorkoutStep[];
}

export interface IntervalsCalendarEvent {
  id: number;
  category: string;
  name: string;
  start_date_local: string;
  type?: string;
  /** Raw Markdown body, present on `category === 'NOTE'` events. */
  description?: string;
  workout_doc?: IntervalsWorkoutDoc;
}

async function request<T>(
  path: string,
  token: string,
  params?: IntervalsDateRangeParams,
): Promise<T> {
  const url = new URL(`${INTERVALS_API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    throw new IntervalsAuthError();
  }

  if (!response.ok) {
    throw new IntervalsApiError(response.status);
  }

  return (await response.json()) as T;
}

export function getActivities(
  token: string,
  athleteId: string,
  params?: IntervalsDateRangeParams,
): Promise<IntervalsActivity[]> {
  return request<IntervalsActivity[]>(
    intervalsActivitiesPath(athleteId),
    token,
    params,
  );
}

/**
 * Reads the settings of the athlete the token belongs to. Only the zone slice
 * is typed — the endpoint returns a far larger athlete record the app ignores.
 */
export function getAthleteSettings(
  token: string,
): Promise<AthleteZoneSettings> {
  return request<AthleteZoneSettings>(INTERVALS_CURRENT_ATHLETE_PATH, token);
}

export function getCalendarEvents(
  token: string,
  athleteId: string,
  params?: IntervalsDateRangeParams,
): Promise<IntervalsCalendarEvent[]> {
  return request<IntervalsCalendarEvent[]>(
    intervalsCalendarEventsPath(athleteId),
    token,
    params,
  );
}
