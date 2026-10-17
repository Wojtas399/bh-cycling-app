import {
  INTERVALS_API_BASE_URL,
  INTERVALS_CURRENT_ATHLETE_PATH,
  intervalsActivitiesPath,
  intervalsCalendarEventPath,
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

export interface IntervalsActivitiesParams extends IntervalsDateRangeParams {
  /** Comma-separated field projection, e.g. `'id,start_date_local,type,paired_event_id'`. */
  fields?: string;
}

export interface IntervalsActivity {
  id: string;
  name: string;
  type: string;
  start_date_local: string;
  moving_time: number;
  distance: number;
  icu_training_load?: number;
  /** The calendar event this activity fulfils, when intervals.icu paired one. */
  paired_event_id?: number;
  /** Seconds from start to finish, stops included. */
  elapsed_time?: number;
  /** Intensity factor as a percentage (IF × 100). */
  icu_intensity?: number;
  /** W. */
  icu_average_watts?: number;
  /** Normalized power, W. */
  icu_weighted_avg_watts?: number;
  /** Variability index, a ratio (NP / average power). */
  icu_variability_index?: number;
  /** bpm. */
  average_heartrate?: number;
  /** bpm. */
  max_heartrate?: number;
  /** rpm. */
  average_cadence?: number;
  /** m. */
  total_elevation_gain?: number;
  /** kcal. */
  calories?: number;
  /** Work, J. */
  icu_joules?: number;
  /** m/s. */
  average_speed?: number;
  /**
   * intervals.icu's plan compliance, %. `null` when not calculated, negative
   * when the athlete asked to ignore it.
   */
  compliance?: number | null;
}

export interface IntervalsWorkoutDoc {
  duration?: number;
  /** The workout's steps in time order, with repeats nested (see `WorkoutStep`). */
  steps?: WorkoutStep[];
}

export interface IntervalsCalendarEvent {
  id: number;
  category: string;
  name: string;
  start_date_local: string;
  type?: string;
  /** Free-text notes. */
  description?: string;
  /** Planned duration, s. */
  moving_time?: number;
  /** Planned distance, m. */
  distance?: number;
  icu_training_load?: number;
  /** Planned intensity factor as a percentage (IF × 100). */
  icu_intensity?: number;
  /** Planned work, J. */
  joules?: number;
  workout_doc?: IntervalsWorkoutDoc;
}

export interface IntervalsRequestOptions {
  /** Aborts the request in flight, e.g. when React Query cancels its query. */
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  token: string,
  params?: IntervalsDateRangeParams,
  { signal }: IntervalsRequestOptions = {},
): Promise<T> {
  const url = new URL(`${INTERVALS_API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(
      params as Record<string, string | undefined>,
    )) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
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
  params?: IntervalsActivitiesParams,
  options?: IntervalsRequestOptions,
): Promise<IntervalsActivity[]> {
  return request<IntervalsActivity[]>(
    intervalsActivitiesPath(athleteId),
    token,
    params,
    options,
  );
}

/**
 * Reads the settings of the athlete the token belongs to. Only the zone slice
 * is typed — the endpoint returns a far larger athlete record the app ignores.
 */
export function getAthleteSettings(
  token: string,
  options?: IntervalsRequestOptions,
): Promise<AthleteZoneSettings> {
  return request<AthleteZoneSettings>(
    INTERVALS_CURRENT_ATHLETE_PATH,
    token,
    undefined,
    options,
  );
}

export function getCalendarEvents(
  token: string,
  athleteId: string,
  params?: IntervalsDateRangeParams,
  options?: IntervalsRequestOptions,
): Promise<IntervalsCalendarEvent[]> {
  return request<IntervalsCalendarEvent[]>(
    intervalsCalendarEventsPath(athleteId),
    token,
    params,
    options,
  );
}

/**
 * Reads one calendar event by id. A deleted or unknown event surfaces as an
 * `IntervalsApiError` with status 404.
 */
export function getCalendarEvent(
  token: string,
  athleteId: string,
  eventId: number,
  options?: IntervalsRequestOptions,
): Promise<IntervalsCalendarEvent> {
  return request<IntervalsCalendarEvent>(
    intervalsCalendarEventPath(athleteId, eventId),
    token,
    undefined,
    options,
  );
}
