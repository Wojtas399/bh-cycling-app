import type {
  ActivityDetails,
  ActivityProfileSummary,
} from './activityDetails';
import { type RideSettings, resolveRideSettings } from './rideSettings';
import { NO_ZONE_TIMES, type ZoneTimes } from './timeInZone';
import type { WorkoutDetails, WorkoutProfileSummary } from './workoutDetails';
import { GAP_BAND, type WorkoutBlock } from './workoutProfile';

/** Which strip of the card: the plan, or the ride. */
export type StripSide = 'planned' | 'recorded';

/** One strip of the profile card, its blocks on the card's time scale. */
export interface ProfileStrip<Summary> {
  /** Widths are shares of the card's `durationSeconds`, not the strip's. */
  blocks: WorkoutBlock[];
  /** The strip's own numbers, for the screen reader. */
  summary: Summary;
  /**
   * The FTP the strip's watts come from, in W: the current Ride FTP for the
   * plan, and the one intervals.icu used for the ride. `null` when there is
   * none, and the strip can only be read in %FTP.
   */
  ftp: number | null;
  /**
   * The time in each zone the card lists for the strip when it's known
   * outside the strip: the plan's from its steps, the ride's from
   * intervals.icu. `null` to count it from what the strip draws.
   */
  zoneTimes: ZoneTimes | null;
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
 * What the large profile card is drawn from: its strips and the Ride settings
 * to draw them by (see `buildDetailedProfile`).
 */
export interface ProfileCardSource {
  card: ProfileCard;
  settings: RideSettings;
}

/**
 * No Workout Profile, for a card with the recorded strip alone: an
 * Activity's on Activity Details.
 */
export const NO_WORKOUT_PROFILE: Pick<
  WorkoutDetails,
  'blocks' | 'profileSummary' | 'zoneTimes'
> = { blocks: [], profileSummary: null, zoneTimes: NO_ZONE_TIMES };

/**
 * The profile card of a Workout, given its paired Activity's details:
 * `undefined` while they load, when they failed or when there's no Activity
 * to fetch. Without a drawable Activity Profile the plan shows alone, as on a
 * planned Workout; without a Workout Profile (a non-cycling Workout), or
 * with one of no known duration, the Activity's shows alone. `null` when
 * neither has one. The plan's watts come from `currentFtp`, the athlete's Ride
 * FTP today; the ride's from the FTP intervals.icu used for it, or
 * `currentFtp` when it kept none.
 */
export function buildProfileCard(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary' | 'zoneTimes'>,
  activity: ActivityDetails | undefined,
  currentFtp: number | null,
): ProfileCard | null {
  const recorded =
    activity && !activity.isStravaActivity && activity.profileSummary
      ? {
          blocks: activity.blocks,
          summary: activity.profileSummary,
          ftp: activity.icuFtp ?? currentFtp,
          zoneTimes: activity.zoneTimes,
        }
      : null;
  // A plan with no known duration can't be placed in time beside the ride.
  const planned =
    workout.profileSummary &&
    !(recorded && workout.profileSummary.durationSeconds <= 0)
      ? {
          blocks: workout.blocks,
          summary: workout.profileSummary,
          ftp: currentFtp,
          zoneTimes: workout.zoneTimes,
        }
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
function onTimeScale<Strip extends ProfileStrip<{ durationSeconds: number }>>(
  strip: Strip,
  durationSeconds: number,
): Strip {
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

/**
 * The card of `workout` above `activity` (see `buildProfileCard`), drawn by
 * the athlete's Ride `settings`: on Coggan's zones in %FTP when there are
 * none, as when they failed. `null` when neither side has a profile.
 */
export function profileCardSource(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary' | 'zoneTimes'>,
  activity: ActivityDetails | undefined,
  settings: RideSettings | undefined,
): ProfileCardSource | null {
  const drawnBy = settings ?? resolveRideSettings(null);
  const card = buildProfileCard(workout, activity, drawnBy.ftp);

  return card && { card, settings: drawnBy };
}
