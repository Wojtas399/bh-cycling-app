import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import type { LocalDateString } from './localDate';
import type { ZoneConfig } from './powerZones';
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
export const WORKOUT_DETAILS_ACTIVITY_FIELDS =
  'id,start_date_local,type,paired_event_id';

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
    steps: buildWorkoutSteps(event.workout_doc?.steps, zoneConfig),
  };
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
