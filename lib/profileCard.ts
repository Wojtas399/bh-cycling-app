import type {
  ActivityDetails,
  ActivityProfileSummary,
} from './activityDetails';
import type { WorkoutDetails, WorkoutProfileSummary } from './workoutDetails';
import { GAP_BAND, type WorkoutBlock } from './workoutProfile';

/** One strip of the profile card, its blocks on the card's time scale. */
export interface ProfileStrip<Summary> {
  /** Widths are shares of the card's `durationSeconds`, not the strip's. */
  blocks: WorkoutBlock[];
  /** The strip's own numbers, for the screen reader. */
  summary: Summary;
}

/**
 * Workout Details' profile card: the planned Workout Profile above the
 * recorded Activity Profile, on one shared time scale. A strip shorter than the
 * card ends early, so the two line up in time.
 */
export interface ProfileCard {
  /** The shared time scale: the longer of the two strips, in s. */
  durationSeconds: number;
  recorded: ProfileStrip<ActivityProfileSummary> | null;
  planned: ProfileStrip<WorkoutProfileSummary> | null;
}

/**
 * The profile card of a Workout, given its paired Activity's details:
 * `undefined` while they load, when they failed or when there's no Activity
 * to fetch. Without a drawable Activity Profile the plan shows alone, as on a
 * planned Workout; without a Workout Profile (a non-cycling Workout), or
 * with one of no known duration, the Activity's shows alone. `null` when
 * neither has one.
 */
export function buildProfileCard(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary'>,
  activity: ActivityDetails | undefined,
): ProfileCard | null {
  const recorded =
    activity && !activity.isStravaActivity && activity.profileSummary
      ? { blocks: activity.blocks, summary: activity.profileSummary }
      : null;
  // A plan with no known duration can't be placed in time beside the ride.
  const planned =
    workout.profileSummary &&
    !(recorded && workout.profileSummary.durationSeconds <= 0)
      ? { blocks: workout.blocks, summary: workout.profileSummary }
      : null;

  if (!planned && !recorded) return null;

  const durationSeconds = Math.max(
    planned?.summary.durationSeconds ?? 0,
    recorded?.summary.durationSeconds ?? 0,
  );

  return {
    durationSeconds,
    recorded: recorded && onTimeScale(recorded, durationSeconds),
    planned: planned && onTimeScale(planned, durationSeconds),
  };
}

/**
 * A strip's blocks rescaled from its own span to the card's, with an empty
 * gap for the time it doesn't cover. Left as is when it already spans the
 * card, or when no span is known to scale by.
 */
function onTimeScale<Summary extends { durationSeconds: number }>(
  strip: ProfileStrip<Summary>,
  durationSeconds: number,
): ProfileStrip<Summary> {
  const own = strip.summary.durationSeconds;

  if (own <= 0 || own >= durationSeconds) return strip;

  const share = own / durationSeconds;

  return {
    ...strip,
    blocks: [
      ...strip.blocks.map(block => ({
        ...block,
        widthFraction: block.widthFraction * share,
      })),
      { widthFraction: 1 - share, ...GAP_BAND },
    ],
  };
}
