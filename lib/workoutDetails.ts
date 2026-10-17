import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import type { LocalDateString } from './localDate';
import type { ZoneConfig } from './powerZones';
import {
  type WorkoutBlock,
  buildWorkoutProfile,
  profileCeilingPct,
} from './workoutProfile';
import { type WorkoutStatus, workoutStatus } from './workoutStatus';

/**
 * The activity fields Workout Details asks for: what pairing needs. Completed
 * mode extends it with the summary metrics it shows.
 */
export const WORKOUT_DETAILS_ACTIVITY_FIELDS = [
  'id',
  'start_date_local',
  'type',
  'paired_event_id',
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
].join(',');

/**
 * The Activity paired to the event, matched on `paired_event_id` only, as on
 * the Calendar: an Activity without it (a Strava stub) never pairs. When
 * several are paired, the earliest ridden wins.
 */
export function pairedActivity(
  activities: IntervalsActivity[],
  eventId: number,
): IntervalsActivity | null {
  return activities
    .filter(activity => activity.paired_event_id === eventId)
    .reduce<IntervalsActivity | null>(
      (earliest, activity) =>
        earliest && earliest.start_date_local <= activity.start_date_local
          ? earliest
          : activity,
      null,
    );
}

/**
 * What the Workout Details query stores: the event, the Activity paired to it
 * (if any) and the zones to colour it by. Status-free, because the Workout
 * Status depends on today; `buildWorkoutDetails` derives it when read.
 */
export interface StoredWorkoutDetails {
  event: IntervalsCalendarEvent;
  /** The earliest Activity paired to the event, `null` when none is. */
  activity: IntervalsActivity | null;
  zoneConfig: ZoneConfig;
}

/**
 * `planned` for a Workout without a paired Activity (Workout Status `planned`
 * or `missed`), `completed` for one with.
 */
export type WorkoutDetailsMode = 'planned' | 'completed';

/** Numbers behind the large profile's accessibility summary. */
export interface WorkoutProfileSummary {
  durationSeconds: number;
  /** Steps drawn in the profile, repeats counted once per rep. */
  stepCount: number;
  /** Highest power any step asks for, in %FTP. */
  peakFtpPct: number;
}

/**
 * The planned metrics of a Workout, in intervals.icu's units. A metric
 * intervals.icu doesn't supply is absent, never zero.
 */
export interface WorkoutPlanMetrics {
  durationSeconds?: number;
  load?: number;
  /** IF × 100. */
  intensityPct?: number;
  workJoules?: number;
  /** Present only when the plan has a distance above zero. */
  distanceMeters?: number;
}

/**
 * The Workout Details screen's view model: numbers and structure only. Labels
 * and unit formatting are left to the screen.
 */
export interface WorkoutDetails {
  mode: WorkoutDetailsMode;
  status: WorkoutStatus;
  title: string;
  /** Local calendar date the Workout is scheduled on, `YYYY-MM-DD`. */
  date: LocalDateString;
  /** The Workout Profile, empty when there is no honest shape to draw. */
  blocks: WorkoutBlock[];
  /** `null` exactly when `blocks` is empty. */
  profileSummary: WorkoutProfileSummary | null;
  /** Plan vs wykonanie, `null` in planned mode. */
  comparison: WorkoutComparison | null;
  /** The Activity's summary metrics, `null` in planned mode. */
  activityMetrics: ActivityMetric[] | null;
  /** What the plan asks for, shown in planned mode. */
  planMetrics: WorkoutPlanMetrics;
  /**
   * The Workout's free-text notes, trimmed, without the builder's step lines.
   * Absent when there are none.
   */
  description?: string;
}

/**
 * A summary metric of the paired Activity. Units as intervals.icu sends them:
 * times in s, distance and elevation in m, intensity in % (IF × 100), power
 * in W, heart rate in bpm, cadence in rpm, calories in kcal, speed in m/s and
 * the variability index as a ratio.
 */
export type ActivityMetricKey =
  | 'movingTime'
  | 'distance'
  | 'load'
  | 'intensity'
  | 'averagePower'
  | 'normalizedPower'
  | 'averageHeartRate'
  | 'maxHeartRate'
  | 'cadence'
  | 'elevationGain'
  | 'calories'
  | 'averageSpeed'
  | 'elapsedTime'
  | 'variabilityIndex';

export interface ActivityMetric {
  metric: ActivityMetricKey;
  value: number;
}

/** Where each Activity metric comes from, in display order. */
const ACTIVITY_METRIC_FIELDS: [ActivityMetricKey, keyof IntervalsActivity][] = [
  ['movingTime', 'moving_time'],
  ['distance', 'distance'],
  ['load', 'icu_training_load'],
  ['intensity', 'icu_intensity'],
  ['averagePower', 'icu_average_watts'],
  ['normalizedPower', 'icu_weighted_avg_watts'],
  ['averageHeartRate', 'average_heartrate'],
  ['maxHeartRate', 'max_heartrate'],
  ['cadence', 'average_cadence'],
  ['elevationGain', 'total_elevation_gain'],
  ['calories', 'calories'],
  ['averageSpeed', 'average_speed'],
  ['elapsedTime', 'elapsed_time'],
  ['variabilityIndex', 'icu_variability_index'],
];

/** A metric with the same meaning and unit on the plan and the Activity. */
export type ComparisonMetric = 'duration' | 'load' | 'intensity' | 'work';

/**
 * One like-for-like row of Plan vs wykonanie. Units: duration in s, intensity
 * in % (IF × 100), work in kJ.
 */
export interface ComparisonRow {
  metric: ComparisonMetric;
  planned: number;
  actual: number;
  /** `actual − planned`. */
  difference: number;
}

export interface WorkoutComparison {
  /** Only the metrics present on both sides, in display order. */
  rows: ComparisonRow[];
  /** intervals.icu's compliance in %, `null` unless a non-negative number. */
  compliance: number | null;
}

/** Builds the view model of a stored Workout as of `today`. */
export function buildWorkoutDetails(
  { event, activity, zoneConfig }: StoredWorkoutDetails,
  today: LocalDateString,
): WorkoutDetails {
  const date = event.start_date_local.slice(0, 10);
  const blocks = buildWorkoutProfile(event.workout_doc?.steps, zoneConfig);
  const status = workoutStatus(
    { id: event.id, name: event.name, date, blocks },
    new Set(activity ? [event.id] : []),
    today,
  );

  return {
    mode: status === 'completed' ? 'completed' : 'planned',
    status,
    title: event.name,
    date,
    blocks,
    profileSummary: summariseProfile(event, blocks),
    comparison: activity ? compareWithPlan(event, activity) : null,
    activityMetrics: activity ? summariseActivity(activity) : null,
    planMetrics: buildPlanMetrics(event),
    ...notes(event),
  };
}

/** The Activity's summary metrics it actually has; absent ones are dropped. */
function summariseActivity(activity: IntervalsActivity): ActivityMetric[] {
  return ACTIVITY_METRIC_FIELDS.flatMap(([metric, field]) => {
    const value = activity[field];

    return isFiniteNumber(value) ? [{ metric, value }] : [];
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toKj(joules: number | undefined): number | undefined {
  return isFiniteNumber(joules) ? joules / 1000 : undefined;
}

function compareWithPlan(
  event: IntervalsCalendarEvent,
  activity: IntervalsActivity,
): WorkoutComparison {
  const pairs: [ComparisonMetric, number | undefined, number | undefined][] = [
    [
      'duration',
      event.moving_time ?? event.workout_doc?.duration,
      activity.moving_time,
    ],
    ['load', event.icu_training_load, activity.icu_training_load],
    ['intensity', event.icu_intensity, activity.icu_intensity],
    ['work', toKj(event.joules), toKj(activity.icu_joules)],
  ];

  const rows = pairs.flatMap(([metric, planned, actual]) =>
    isFiniteNumber(planned) && isFiniteNumber(actual)
      ? [{ metric, planned, actual, difference: actual - planned }]
      : [],
  );

  // intervals.icu sends null when it hasn't calculated compliance and a
  // negative number when the athlete asked to ignore it.
  const { compliance } = activity;

  return {
    rows,
    compliance:
      isFiniteNumber(compliance) && compliance >= 0 ? compliance : null,
  };
}

/**
 * `workout_doc.description` is the free text alone; the event's own
 * `description` also carries the step lines, so it is never used.
 */
function notes(event: IntervalsCalendarEvent): { description?: string } {
  const description = event.workout_doc?.description?.trim();

  return description ? { description } : {};
}

function summariseProfile(
  event: IntervalsCalendarEvent,
  blocks: WorkoutBlock[],
): WorkoutProfileSummary | null {
  if (blocks.length === 0) return null;

  // A top-level step's duration covers all of its reps, so summing the top
  // level stands in when the doc carries no total.
  const durationSeconds =
    event.workout_doc?.duration ??
    (event.workout_doc?.steps ?? []).reduce(
      (sum, step) => sum + (step.duration ?? 0),
      0,
    );

  return {
    durationSeconds,
    stepCount: blocks.length,
    peakFtpPct: profileCeilingPct(blocks),
  };
}

function buildPlanMetrics({
  moving_time,
  icu_training_load,
  icu_intensity,
  joules,
  distance,
  workout_doc,
}: IntervalsCalendarEvent): WorkoutPlanMetrics {
  const durationSeconds = isPresent(moving_time)
    ? moving_time
    : workout_doc?.duration;
  const distanceMeters = [distance, workout_doc?.distance].find(
    metres => isPresent(metres) && metres > 0,
  );

  return withoutAbsent({
    durationSeconds,
    load: icu_training_load,
    intensityPct: icu_intensity,
    workJoules: joules,
    distanceMeters,
  });
}

/** A metric intervals.icu actually supplied: a finite number, not null. */
function isPresent(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Drops the metrics that are absent, so none reads as zero or a dash. */
function withoutAbsent<T extends Record<string, number | null | undefined>>(
  metrics: T,
): { [K in keyof T]?: number } {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => isPresent(value)),
  ) as { [K in keyof T]?: number };
}
