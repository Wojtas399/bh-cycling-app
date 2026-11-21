import type {
  ActivityDetails,
  ActivityProfileSummary,
} from './activityDetails';
import { type RideSettings, resolveRideSettings } from './rideSettings';
import { NO_ZONE_TIMES, type ZoneTimes } from './timeInZone';
import type { WorkoutDetails, WorkoutProfileSummary } from './workoutDetails';
import { GAP_BAND, type WorkoutBlock } from './workoutProfile';

export type StripSide = 'planned' | 'recorded';

export interface ProfileStrip<Summary> {
  blocks: WorkoutBlock[];
  summary: Summary;
  ftp: number | null;
  zoneTimes: ZoneTimes | null;
}

export interface ProfileCard {
  durationSeconds: number;
  recorded: ProfileStrip<ActivityProfileSummary> | null;
  planned: ProfileStrip<WorkoutProfileSummary> | null;
}

export interface ProfileCardSource {
  card: ProfileCard;
  settings: RideSettings;
}

export const NO_WORKOUT_PROFILE: Pick<
  WorkoutDetails,
  'blocks' | 'profileSummary' | 'zoneTimes'
> = { blocks: [], profileSummary: null, zoneTimes: NO_ZONE_TIMES };

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
  const planHasNoKnownDuration =
    (workout.profileSummary?.durationSeconds ?? 0) <= 0;
  const planned =
    workout.profileSummary && !(recorded && planHasNoKnownDuration)
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
    recorded: recorded && onCardTimeScale(recorded, durationSeconds),
    planned: planned && onCardTimeScale(planned, durationSeconds),
  };
}

function onCardTimeScale<
  Strip extends ProfileStrip<{ durationSeconds: number }>,
>(strip: Strip, cardDurationSeconds: number): Strip {
  const ownDurationSeconds = strip.summary.durationSeconds;
  const spanUnknownOrWholeCard =
    ownDurationSeconds <= 0 || ownDurationSeconds >= cardDurationSeconds;

  if (spanUnknownOrWholeCard) return strip;

  const share = ownDurationSeconds / cardDurationSeconds;

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

export function profileCardSource(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary' | 'zoneTimes'>,
  activity: ActivityDetails | undefined,
  settings: RideSettings | undefined,
): ProfileCardSource | null {
  const drawnBy = settings ?? resolveRideSettings(null);
  const card = buildProfileCard(workout, activity, drawnBy.ftp);

  return card && { card, settings: drawnBy };
}
