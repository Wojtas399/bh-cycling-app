import { type ActivityMetric, summariseActivity } from './activitySummary';
import { isCyclingWorkout, rideSteps } from './cyclingWorkout';
import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import type { LocalDateString } from './localDate';
import type { WorkoutPairing } from './pairing';
import { plannedDurationSeconds } from './plannedDuration';
import type { ZoneConfig } from './powerZones';
import { type RouteSummary, summariseRoute } from './route';
import { isStravaActivity, stravaActivityUrl } from './stravaActivity';
import { stripNoteHtml } from './stripNoteHtml';
import {
  type WorkoutBlock,
  buildWorkoutProfile,
  profileCeilingPct,
} from './workoutProfile';
import { type WorkoutStatus, workoutStatus } from './workoutStatus';
import { type WorkoutDetailsStep, buildWorkoutSteps } from './workoutSteps';

/**
 * The activity fields Workout Details asks for: what pairing needs, the name
 * and type that tell a Strava Activity apart, and the summary metrics
 * completed mode shows.
 */
export const WORKOUT_DETAILS_ACTIVITY_FIELDS = [
  'id',
  'start_date_local',
  'name',
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
  /**
   * See `isCyclingWorkout`. A non-cycling Workout has no steps, profile or
   * planned work, and its description is its content.
   */
  isCyclingWorkout: boolean;
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
  /** What the plan asks for, shown whenever there is no `comparison`. */
  planMetrics: WorkoutPlanMetrics;
  /**
   * The Workout's notes as Note Markdown, HTML stripped and trimmed: a ride's
   * free text without the builder's step lines, or a non-cycling Workout's
   * whole description. Absent when there are none.
   */
  description?: string;
  /**
   * What the Route banner needs, `null` without Activity numbers (see
   * `comparison`) and whenever the paired Activity has no Route (see
   * `activityHasRoute`).
   */
  route: RouteSummary | null;
  /**
   * The Strava Activity that completed the Workout, for the Wykonanie card.
   * `null` in planned mode, for a native Activity and when the paired
   * Activity isn't among those fetched.
   */
  stravaActivity: StravaActivitySummary | null;
}

/** What is known of a Strava Activity: its id and when it started. */
export interface StravaActivitySummary {
  /** intervals.icu's id for it, taken to be its Strava activity id. */
  id: string;
  /** Local start time, `HH:MM`. */
  startTime: string;
  /** Its page on Strava. */
  url: string;
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
  const steps = rideSteps(event);
  const blocks = buildWorkoutProfile(steps, zoneConfig);
  const status = workoutStatus(
    { id: event.id, date },
    new Set(completed ? [event.id] : []),
    today,
  );
  // A Strava Activity carries no numbers to show (intervals.icu can't share
  // it), so it gets no empty cards.
  const measured = activity && !isStravaActivity(activity) ? activity : null;
  const strava = activity && !measured ? activity : null;

  return {
    mode: status === 'completed' ? 'completed' : 'planned',
    status,
    isCyclingWorkout: isCyclingWorkout(event),
    title: event.name,
    date,
    blocks,
    profileSummary: summariseProfile(event, blocks),
    steps: buildWorkoutSteps(steps, zoneConfig),
    comparison: measured ? compareWithPlan(event, measured) : null,
    activityMetrics: measured ? summariseActivity(measured) : null,
    planMetrics: buildPlanMetrics(event),
    ...notes(event),
    route: measured ? summariseRoute(measured) : null,
    stravaActivity: strava
      ? {
          id: strava.id,
          startTime: strava.start_date_local.slice(11, 16),
          url: stravaActivityUrl(strava.id),
        }
      : null,
  };
}

function toKj(joules: number | undefined): number | undefined {
  return isFiniteNumber(joules) ? joules / 1000 : undefined;
}

/** Comes from the same step parse, so only a Cycling Workout has it. */
function plannedWorkKj(event: IntervalsCalendarEvent): number | undefined {
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
    ['work', plannedWorkKj(event), toKj(activity.icu_joules)],
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
 * A ride's `workout_doc.description` is the free text alone, since its own
 * `description` also carries the step lines. A non-cycling Workout's step
 * parse eats every line with a duration or a %, so its own `description` is
 * the one that holds the whole plan.
 */
function notes(event: IntervalsCalendarEvent): { description?: string } {
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
  const { icu_training_load, icu_intensity, distance, workout_doc } = event;
  const distanceMeters = [distance, workout_doc?.distance].find(
    metres => isFiniteNumber(metres) && metres > 0,
  );

  return withoutAbsent({
    durationSeconds: plannedDurationSeconds(event),
    load: icu_training_load,
    intensityPct: icu_intensity,
    workKj: plannedWorkKj(event),
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
