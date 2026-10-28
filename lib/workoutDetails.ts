import { type ActivityMetric, summariseActivity } from './activitySummary';
import { isStravaActivity } from './calendarItems';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import type { LocalDateString } from './localDate';
import {
  type PairableEvent,
  type WorkoutPairing,
  pairWorkouts,
} from './pairing';
import { plannedDurationSeconds } from './plannedDuration';
import type { ZoneConfig } from './powerZones';
import { type RouteSummary, summariseRoute } from './route';
import {
  type WorkoutBlock,
  buildWorkoutProfile,
  profileCeilingPct,
} from './workoutProfile';
import { type WorkoutStatus, workoutStatus } from './workoutStatus';
import { type WorkoutDetailsStep, buildWorkoutSteps } from './workoutSteps';

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
  'stream_types',
  'trainer',
].join(',');

/**
 * How the event is paired, by the shared rule in `pairWorkouts`: from either
 * side, the earliest paired Activity winning. Completed even when the
 * Activity the event names isn't among `activities`.
 */
export function pairWorkout(
  event: PairableEvent,
  activities: IntervalsActivity[],
): WorkoutPairing {
  return (
    pairWorkouts([event], activities).byEventId.get(event.id) ?? {
      completed: false,
      activity: null,
    }
  );
}

/**
 * What the Workout Details query stores: the event, how it is paired and the
 * zones to colour it by. Status-free, because the Workout Status depends on
 * today; `buildWorkoutDetails` derives it when read.
 */
export interface StoredWorkoutDetails extends WorkoutPairing {
  event: IntervalsCalendarEvent;
  zoneConfig: ZoneConfig;
}

/**
 * `planned` for an unpaired Workout (Workout Status `planned` or `missed`),
 * `completed` for a paired one.
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
 * The planned metrics of a Workout: duration in s, intensity in % (IF × 100),
 * work in kJ and distance in m. A metric intervals.icu doesn't supply is
 * absent, never zero.
 */
export interface WorkoutPlanMetrics {
  durationSeconds?: number;
  load?: number;
  /** IF × 100. */
  intensityPct?: number;
  workKj?: number;
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
  /** The Kroki tree: the doc's steps in order, repeats nested. */
  steps: WorkoutDetailsStep[];
  /**
   * Plan vs wykonanie, `null` in planned mode and whenever there are no
   * Activity numbers to compare: its Activity is a Strava Activity or isn't
   * among those fetched.
   */
  comparison: WorkoutComparison | null;
  /** The Activity's summary metrics, `null` exactly when `comparison` is. */
  activityMetrics: ActivityMetric[] | null;
  /** What the plan asks for, shown in planned mode. */
  planMetrics: WorkoutPlanMetrics;
  /**
   * The Workout's free-text notes, trimmed, without the builder's step lines.
   * Absent when there are none.
   */
  description?: string;
  /**
   * What the Route banner needs, `null` without Activity numbers (see
   * `comparison`) and whenever the paired Activity has no Route (see
   * `activityHasRoute`).
   */
  route: RouteSummary | null;
}

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
  { event, completed, activity, zoneConfig }: StoredWorkoutDetails,
  today: LocalDateString,
): WorkoutDetails {
  const date = event.start_date_local.slice(0, 10);
  const blocks = buildWorkoutProfile(event.workout_doc?.steps, zoneConfig);
  const status = workoutStatus(
    { id: event.id, date },
    new Set(completed ? [event.id] : []),
    today,
  );
  // A Strava Activity carries no numbers to show (intervals.icu can't share
  // it), so it gets no empty cards.
  const measured = activity && !isStravaActivity(activity) ? activity : null;

  return {
    mode: status === 'completed' ? 'completed' : 'planned',
    status,
    title: event.name,
    date,
    blocks,
    profileSummary: summariseProfile(event, blocks),
    steps: buildWorkoutSteps(event.workout_doc?.steps, zoneConfig),
    comparison: measured ? compareWithPlan(event, measured) : null,
    activityMetrics: measured ? summariseActivity(measured) : null,
    planMetrics: buildPlanMetrics(event),
    ...notes(event),
    route: measured ? summariseRoute(measured) : null,
  };
}

function toKj(joules: number | undefined): number | undefined {
  return isFiniteNumber(joules) ? joules / 1000 : undefined;
}

function compareWithPlan(
  event: IntervalsCalendarEvent,
  activity: IntervalsActivity,
): WorkoutComparison {
  const pairs: [ComparisonMetric, number | undefined, number | undefined][] = [
    ['duration', plannedDurationSeconds(event), activity.moving_time],
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

function buildPlanMetrics(event: IntervalsCalendarEvent): WorkoutPlanMetrics {
  const { icu_training_load, icu_intensity, joules, distance, workout_doc } =
    event;
  const distanceMeters = [distance, workout_doc?.distance].find(
    metres => isFiniteNumber(metres) && metres > 0,
  );

  return withoutAbsent({
    durationSeconds: plannedDurationSeconds(event),
    load: icu_training_load,
    intensityPct: icu_intensity,
    workKj: toKj(joules),
    distanceMeters,
  });
}

/** Drops the metrics that are absent, so none reads as zero or a dash. */
function withoutAbsent<T extends Record<string, number | null | undefined>>(
  metrics: T,
): { [K in keyof T]?: number } {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => isFiniteNumber(value)),
  ) as { [K in keyof T]?: number };
}
