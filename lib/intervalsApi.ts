import {
  INTERVALS_API_BASE_URL,
  INTERVALS_CURRENT_ATHLETE_PATH,
  intervalsActivitiesPath,
  intervalsActivityMapPath,
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

/** True when Intervals.icu answered 404: the thing asked for doesn't exist. */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof IntervalsApiError && error.status === 404;
}

export interface IntervalsDateRangeParams {
  oldest?: string;
  newest?: string;
}

/**
 * The calendar event categories the app reads. intervals.icu has more (races,
 * holidays, …), which arrive as plain strings on `IntervalsCalendarEvent`.
 */
export const EVENT_CATEGORY = {
  workout: 'WORKOUT',
  note: 'NOTE',
} as const;

export type EventCategory =
  (typeof EVENT_CATEGORY)[keyof typeof EVENT_CATEGORY];

export interface IntervalsCalendarEventsParams extends IntervalsDateRangeParams {
  /** Only events of this category. */
  category?: EventCategory;
}

export interface IntervalsActivitiesParams extends IntervalsDateRangeParams {
  /** Comma-separated field projection, e.g. `'id,start_date_local,type,paired_event_id'`. */
  fields?: string;
}

export interface IntervalsActivity {
  id: string;
  /**
   * Absent, like `type`, on a Strava Activity: intervals.icu can't share an
   * Activity it received from Strava, so the list returns it without either.
   */
  name?: string;
  /** intervals.icu's sport type, e.g. `Ride`, `VirtualRide`, `Run`. */
  type?: string;
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
  /** The streams recorded for the Activity; `latlng` means it has GPS. */
  stream_types?: string[];
  /** Ridden on a trainer. intervals.icu omits it when it's false. */
  trainer?: boolean;
}

/**
 * An Activity's GPS track, as verified against the real API. The response
 * also carries `route` and `weather`, which the app doesn't use.
 */
export interface IntervalsActivityMap {
  /** [lat, lng] pairs, not thinned (same count as the latlng stream). */
  latlngs?: ([number, number] | null)[] | null;
  /** [[minLat, minLng], [maxLat, maxLng]]. */
  bounds?: [[number, number], [number, number]] | null;
}

export interface IntervalsWorkoutDoc {
  duration?: number;
  /** The free-text notes only, without the builder's step lines. */
  description?: string;
  /** Planned distance in metres, usually 0 for a time-based ride. */
  distance?: number;
  /** The workout's steps in time order, with repeats nested (see `WorkoutStep`). */
  steps?: WorkoutStep[];
}

export interface IntervalsCalendarEvent {
  id: number;
  /** An `EventCategory`, or one of the others the app ignores. */
  category: string;
  /**
   * On a Note it may also be `null`, `""` or missing; `toNotes` reads events
   * as `NoteEvent`, which says so, so Workout code can keep it a string.
   */
  name: string;
  start_date_local: string;
  /**
   * The local midnight after the event's last day (exclusive), e.g. start + 1
   * day for a one-day Note.
   */
  end_date_local?: string | null;
  /** A hex colour such as `'#ff0000'`, or `null` for none. */
  color?: string | null;
  type?: string;
  /**
   * The full builder text: free-text notes plus the step lines. On a Note,
   * its text, which may be `null`, `""` or missing.
   */
  description?: string;
  /** Planned duration in seconds. */
  moving_time?: number;
  /** Planned distance in metres, usually 0 for a time-based ride. */
  distance?: number;
  /** Planned training load. */
  icu_training_load?: number;
  /** Planned intensity in percent (IF × 100). */
  icu_intensity?: number;
  /** Planned work in joules. */
  joules?: number;
  workout_doc?: IntervalsWorkoutDoc;
}

export interface IntervalsRequestOptions {
  /** Aborts the request in flight, e.g. when React Query cancels its query. */
  signal?: AbortSignal;
}

/** The query parameters some endpoint accepts; each public call takes only its own. */
type IntervalsQueryParams =
  | IntervalsCalendarEventsParams
  | IntervalsActivitiesParams;

async function request<T>(
  path: string,
  token: string,
  params?: IntervalsQueryParams,
  { signal }: IntervalsRequestOptions = {},
): Promise<T> {
  const url = new URL(`${INTERVALS_API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params) as [
      string,
      string | undefined,
    ][]) {
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
  params?: IntervalsCalendarEventsParams,
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

/**
 * Reads an Activity's GPS track. An Activity without one, or unknown, surfaces
 * as an `IntervalsApiError` with status 404.
 */
export function getActivityMap(
  token: string,
  activityId: string,
  options?: IntervalsRequestOptions,
): Promise<IntervalsActivityMap> {
  return request<IntervalsActivityMap>(
    intervalsActivityMapPath(activityId),
    token,
    undefined,
    options,
  );
}
