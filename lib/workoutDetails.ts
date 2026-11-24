import { type ActivityMetric, summariseActivity } from './activitySummary';
import {
  type ActivityField,
  type PairedCalendarRange,
  findWorkout,
} from './calendarItems';
import { isCyclingWorkout, rideSteps } from './cyclingWorkout';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import type { LocalDateString } from './localDate';
import type { LocalTimeString } from './localDateTime';
import { plannedDurationSeconds } from './plannedDuration';
import type { RideSettings } from './rideSettings';
import { type RouteSummary, summariseRoute } from './route';
import { isStravaActivity, stravaActivityUrl } from './stravaActivity';
import { stripNoteHtml } from './stripNoteHtml';
import { type ZoneTimes, planZoneTimes } from './timeInZone';
import { entries, fromEntries } from './typed';
import {
  type WorkoutBlock,
  type WorkoutStep,
  buildWorkoutProfile,
  profileCeilingPct,
} from './workoutProfile';
import { type WorkoutStatus, workoutStatus } from './workoutStatus';
import { type WorkoutDetailsStep, buildWorkoutSteps } from './workoutSteps';

export const WORKOUT_DETAILS_ACTIVITY_FIELDS = [
  'moving_time',
  'distance',
  'elapsed_time',
  'icu_training_load',
  'icu_intensity',
  'icu_average_watts',
  'icu_weighted_avg_watts',
  'icu_variability_index',
  'average_heartrate',
  'max_heartrate',
  'average_cadence',
  'total_elevation_gain',
  'calories',
  'icu_joules',
  'average_speed',
  'compliance',
  'stream_types',
  'trainer',
] as const satisfies readonly ActivityField[];

type WorkoutDetailsActivityField =
  (typeof WORKOUT_DETAILS_ACTIVITY_FIELDS)[number];

export interface StoredWorkoutDetails {
  paired: PairedCalendarRange<WorkoutDetailsActivityField>;
  rideSettings: RideSettings;
}

export type WorkoutDetailsMode = 'planned' | 'completed';

export interface WorkoutProfileSummary {
  durationSeconds: number;
  stepCount: number;
  peakFtpPct: number;
}

export interface WorkoutPlanMetrics {
  durationSeconds?: number;
  load?: number;
  intensityPct?: number;
  workKj?: number;
  distanceMeters?: number;
}

export interface WorkoutDetails {
  mode: WorkoutDetailsMode;
  status: WorkoutStatus;
  isCyclingWorkout: boolean;
  title: string;
  date: LocalDateString;
  blocks: WorkoutBlock[];
  profileSummary: WorkoutProfileSummary | null;
  zoneTimes: ZoneTimes;
  rideSettings: RideSettings;
  steps: WorkoutDetailsStep[];
  comparison: WorkoutComparison | null;
  activityMetrics: ActivityMetric[] | null;
  planMetrics: WorkoutPlanMetrics;
  description?: string;
  route: RouteSummary | null;
  stravaActivity: StravaActivitySummary | null;
  recordedActivityId: string | null;
}

export interface StravaActivitySummary {
  id: string;
  startTime: LocalTimeString;
  url: string;
}

export type ComparisonMetric = 'duration' | 'load' | 'intensity' | 'work';

export interface ComparisonRow {
  metric: ComparisonMetric;
  planned: number;
  actual: number;
  difference: number;
}

export interface WorkoutComparison {
  rows: ComparisonRow[];
  compliance: number | null;
}

export function buildWorkoutDetails(
  { paired, rideSettings }: StoredWorkoutDetails,
  eventId: number,
  today: LocalDateString,
): WorkoutDetails | null {
  const workout = findWorkout(paired, eventId);

  if (!workout) return null;

  const { event, activity } = workout;
  const { zoneConfig } = rideSettings;
  const date = event.start_date_local.slice(0, 10);
  const steps = rideSteps(event);
  const blocks = buildWorkoutProfile(steps, zoneConfig);
  const status = workoutStatus(
    { id: event.id, date },
    new Set(paired.completedEventIds),
    today,
  );
  const measured = activity && !isStravaActivity(activity) ? activity : null;
  const stravaWithoutNumbers = activity && !measured ? activity : null;

  return {
    mode: status === 'completed' ? 'completed' : 'planned',
    status,
    isCyclingWorkout: isCyclingWorkout(event),
    title: event.name,
    date,
    blocks,
    profileSummary: summariseProfile(event, blocks),
    zoneTimes: planZoneTimes(steps, zoneConfig),
    rideSettings,
    steps: buildWorkoutSteps(steps, zoneConfig),
    comparison: measured ? compareWithPlan(event, measured) : null,
    activityMetrics: measured ? summariseActivity(measured) : null,
    planMetrics: buildPlanMetrics(event),
    ...descriptionWithoutStepLines(event),
    route: measured ? summariseRoute(measured) : null,
    stravaActivity: stravaWithoutNumbers
      ? {
          id: stravaWithoutNumbers.id,
          startTime: stravaWithoutNumbers.start_date_local.slice(11, 16),
          url: stravaActivityUrl(stravaWithoutNumbers.id),
        }
      : null,
    recordedActivityId: measured ? measured.id : null,
  };
}

function toKj(joules: number | undefined): number | undefined {
  return isFiniteNumber(joules) ? joules / 1000 : undefined;
}

function plannedWorkKjFromTheStepParse(
  event: IntervalsCalendarEvent,
): number | undefined {
  return isCyclingWorkout(event) ? toKj(event.joules) : undefined;
}

function compareWithPlan(
  event: IntervalsCalendarEvent,
  activity: IntervalsActivity,
): WorkoutComparison {
  const pairs: [ComparisonMetric, number | undefined, number | undefined][] = [
    ['duration', plannedDurationSeconds(event), activity.moving_time],
    ['load', event.icu_training_load, activity.icu_training_load],
    ['intensity', event.icu_intensity, activity.icu_intensity],
    ['work', plannedWorkKjFromTheStepParse(event), toKj(activity.icu_joules)],
  ];

  const rows = pairs.flatMap(([metric, planned, actual]) =>
    isFiniteNumber(planned) && isFiniteNumber(actual)
      ? [{ metric, planned, actual, difference: actual - planned }]
      : [],
  );

  return {
    rows,
    compliance: complianceUnlessUncalculatedOrIgnored(activity.compliance),
  };
}

function complianceUnlessUncalculatedOrIgnored(
  compliance: IntervalsActivity['compliance'],
): number | null {
  return isFiniteNumber(compliance) && compliance >= 0 ? compliance : null;
}

function descriptionWithoutStepLines(event: IntervalsCalendarEvent): {
  description?: string;
} {
  const text = isCyclingWorkout(event)
    ? event.workout_doc?.description
    : event.description;
  const description = text && stripNoteHtml(text).trim();

  return description ? { description } : {};
}

function summariseProfile(
  event: IntervalsCalendarEvent,
  blocks: WorkoutBlock[],
): WorkoutProfileSummary | null {
  if (blocks.length === 0) return null;

  const durationSeconds =
    event.workout_doc?.duration ??
    secondsOfTopLevelStepsCoveringTheirReps(event.workout_doc?.steps ?? []);

  return {
    durationSeconds,
    stepCount: blocks.length,
    peakFtpPct: profileCeilingPct(blocks),
  };
}

function secondsOfTopLevelStepsCoveringTheirReps(steps: WorkoutStep[]): number {
  return steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
}

function buildPlanMetrics(event: IntervalsCalendarEvent): WorkoutPlanMetrics {
  const { icu_training_load, icu_intensity, distance, workout_doc } = event;
  const distanceMeters = [distance, workout_doc?.distance].find(
    metres => isFiniteNumber(metres) && metres > 0,
  );

  return withoutAbsentMetrics({
    durationSeconds: plannedDurationSeconds(event),
    load: icu_training_load,
    intensityPct: icu_intensity,
    workKj: plannedWorkKjFromTheStepParse(event),
    distanceMeters,
  });
}

function withoutAbsentMetrics<
  T extends Record<string, number | null | undefined>,
>(metrics: T): { [K in keyof T]?: number } {
  return fromEntries(
    entries(metrics).flatMap(([key, value]) =>
      isFiniteNumber(value) ? [[key, value] as const] : [],
    ),
  );
}
