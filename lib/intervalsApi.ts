import {
  INTERVALS_API_BASE_URL,
  INTERVALS_TOKEN_OWNER_PATH,
  intervalsActivitiesPath,
  intervalsActivityMapPath,
  intervalsActivityPath,
  intervalsCalendarEventPath,
  intervalsCalendarEventsPath,
  intervalsWellnessPath,
  intervalsWellnessRangePath,
} from './intervalsApiPaths';
import type { LocalDateString } from './localDate';
import type { LocalDateTimeString } from './localDateTime';
import type { AthleteZoneSettings, Zone } from './powerZones';
import { entries, readJson } from './typed';
import type { WorkoutStep } from './workoutProfile';

export type Watts = number;
export type Bpm = number;
export type Seconds = number;
export type Milliseconds = number;
export type Percent = number;
export type Meters = number;
export type MetersPerSecond = number;
export type Rpm = number;
export type Kilocalories = number;
export type Joules = number;
export type HexColorString = string;
export type LatLng = [lat: number, lng: number];

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

export function isNotFoundError(error: unknown): boolean {
  return error instanceof IntervalsApiError && error.status === 404;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof IntervalsApiError && error.status === 403;
}

export interface IntervalsDateRangeParams {
  oldest?: LocalDateString;
  newest?: LocalDateString;
}

export const EVENT_CATEGORY = {
  workout: 'WORKOUT',
  note: 'NOTE',
  raceA: 'RACE_A',
  raceB: 'RACE_B',
  raceC: 'RACE_C',
} as const;

export type EventCategory =
  (typeof EVENT_CATEGORY)[keyof typeof EVENT_CATEGORY];

export interface IntervalsCalendarEventsParams extends IntervalsDateRangeParams {
  category?: EventCategory | readonly EventCategory[];
  resolve?: boolean;
}

export type IntervalsField<Row> = keyof Row & string;

export interface IntervalsProjectedRangeParams<
  Row,
> extends IntervalsDateRangeParams {
  fields?: readonly IntervalsField<Row>[];
}

export interface IntervalsActivityParams {
  intervals?: boolean;
}

export interface IntervalsActivityInterval {
  start_time?: Seconds;
  end_time?: Seconds;
  intensity?: Percent | null;
  zone?: Zone | null;
  type?: 'WORK' | 'RECOVERY';
}

export interface IntervalsZoneTime {
  id: string;
  secs: Seconds;
}

export interface IntervalsActivity {
  id: string;
  name?: string;
  type?: string;
  start_date_local: LocalDateTimeString;
  moving_time: Seconds;
  distance: Meters;
  icu_training_load?: number;
  paired_event_id?: number;
  elapsed_time?: Seconds;
  icu_intensity?: Percent;
  icu_average_watts?: Watts;
  icu_weighted_avg_watts?: Watts;
  icu_ftp?: Watts | null;
  icu_zone_times?: IntervalsZoneTime[] | null;
  icu_variability_index?: number;
  average_heartrate?: Bpm;
  max_heartrate?: Bpm;
  average_cadence?: Rpm;
  total_elevation_gain?: Meters;
  calories?: Kilocalories;
  icu_joules?: Joules;
  average_speed?: MetersPerSecond;
  compliance?: Percent | null;
  stream_types?: string[];
  trainer?: boolean;
  description?: string | null;
  icu_intervals?: IntervalsActivityInterval[] | null;
  source?: string;
  _note?: string;
}

export interface IntervalsActivityMap {
  latlngs?: (LatLng | null)[] | null;
  bounds?: [min: LatLng, max: LatLng] | null;
}

export interface IntervalsWorkoutDoc {
  duration?: Seconds;
  description?: string;
  distance?: Meters;
  steps?: WorkoutStep[];
}

export interface IntervalsCalendarEvent {
  id: number;
  category: string;
  name: string;
  start_date_local: LocalDateTimeString;
  end_date_local?: LocalDateTimeString | null;
  color?: HexColorString | null;
  type?: string;
  description?: string;
  moving_time?: Seconds;
  distance?: Meters;
  icu_training_load?: number;
  icu_intensity?: Percent;
  joules?: Joules;
  workout_doc?: IntervalsWorkoutDoc;
  paired_activity_id?: string | null;
}

export interface IntervalsWellness {
  ctl?: number | null;
  atl?: number | null;
  ctlLoad?: number | null;
  readiness?: number | null;
  sleepSecs?: Seconds | null;
  sleepScore?: number | null;
  hrv?: Milliseconds | null;
  hrvSDNN?: Milliseconds | null;
  restingHR?: Bpm | null;
}

export interface IntervalsWellnessDay extends IntervalsWellness {
  id: LocalDateString;
}

export interface IntervalsRequestOptions {
  signal?: AbortSignal;
}

type IntervalsQueryParams =
  | IntervalsCalendarEventsParams
  | IntervalsProjectedRangeParams<IntervalsActivity>
  | IntervalsProjectedRangeParams<IntervalsWellnessDay>
  | IntervalsActivityParams;

type IntervalsParamValue = string | readonly string[] | boolean;

function commaJoinedParamValue(value: IntervalsParamValue): string {
  return Array.isArray(value) ? value.join(',') : String(value);
}

async function request<T>(
  path: string,
  token: string,
  params?: IntervalsQueryParams,
  { signal }: IntervalsRequestOptions = {},
): Promise<T> {
  const url = new URL(`${INTERVALS_API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of entries(params)) {
      if (value === undefined) continue;

      url.searchParams.set(key, commaJoinedParamValue(value));
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

  return readJson<T>(response);
}

export function getActivities(
  token: string,
  athleteId: string,
  params?: IntervalsProjectedRangeParams<IntervalsActivity>,
  options?: IntervalsRequestOptions,
): Promise<IntervalsActivity[]> {
  return request<IntervalsActivity[]>(
    intervalsActivitiesPath(athleteId),
    token,
    params,
    options,
  );
}

interface IntervalsSportSettings {
  types?: string[] | null;
  power_zones?: Percent[] | null;
  ftp?: Watts | null;
}

interface IntervalsAthlete {
  sportSettings?: IntervalsSportSettings[] | null;
}

export interface AthleteRideSettings extends AthleteZoneSettings {
  ftp?: Watts | null;
}

const CYCLING_SPORT_TYPE = 'Ride';

export async function getAthleteSettings(
  token: string,
  options?: IntervalsRequestOptions,
): Promise<AthleteRideSettings> {
  const athlete = await request<IntervalsAthlete>(
    INTERVALS_TOKEN_OWNER_PATH,
    token,
    undefined,
    options,
  );
  const ride = athlete.sportSettings?.find(sport =>
    sport.types?.includes(CYCLING_SPORT_TYPE),
  );

  return { powerZones: ride?.power_zones, ftp: ride?.ftp };
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

export function getActivity(
  token: string,
  activityId: string,
  params?: IntervalsActivityParams,
  options?: IntervalsRequestOptions,
): Promise<IntervalsActivity> {
  return request<IntervalsActivity>(
    intervalsActivityPath(activityId),
    token,
    params,
    options,
  );
}

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

export function getWellness(
  token: string,
  athleteId: string,
  date: LocalDateString,
  options?: IntervalsRequestOptions,
): Promise<IntervalsWellness> {
  return request<IntervalsWellness>(
    intervalsWellnessPath(athleteId, date),
    token,
    undefined,
    options,
  );
}

export function getWellnessRange(
  token: string,
  athleteId: string,
  params: IntervalsProjectedRangeParams<IntervalsWellnessDay>,
  options?: IntervalsRequestOptions,
): Promise<IntervalsWellnessDay[]> {
  return request<IntervalsWellnessDay[]>(
    intervalsWellnessRangePath(athleteId),
    token,
    params,
    options,
  );
}
