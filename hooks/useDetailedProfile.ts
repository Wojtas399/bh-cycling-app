import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import type { ActivityDetails } from '@/lib/activityDetails';
import {
  activityStreamQueryOptions,
  athleteSettingsQueryOptions,
} from '@/lib/intervalsQueries';
import { type ProfileCard, buildProfileCard } from '@/lib/profileCard';
import { type RideSettings, resolveRideSettings } from '@/lib/rideSettings';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

/** Coggan's zones and no FTP, as Workout Profiles fall back to elsewhere. */
const FALLBACK_RIDE_SETTINGS = resolveRideSettings(null);

/**
 * What the large profile card is drawn from, before it's laid out: its strips
 * and the athlete's current Ride settings. `buildDetailedProfile` draws it
 * for the plot's width.
 */
export interface ProfileCardSource {
  card: ProfileCard;
  settings: RideSettings;
}

export interface DetailedProfileState {
  /**
   * The card so far: `null` while the athlete's settings first load, so the
   * card never redraws from %FTP to watts, and when neither side has a
   * profile. While the ride's power stream loads, the plan alone, so the ride
   * never redraws from its intervals to its stream.
   */
  source: ProfileCardSource | null;
  /**
   * Whether the settings and the ride's stream have settled (loaded, failed
   * or found to be missing), so `source` is final.
   */
  isSettled: boolean;
}

/**
 * The large profile card of `workout` above `activity` (see
 * `buildProfileCard`), with its scale from the athlete's current Ride
 * settings. Home, the Calendar and Workout Details fill those settings
 * already, so they're almost always cached. When they failed, the card is
 * drawn on Coggan's zones in %FTP. The ride's power stream is fetched by
 * `activityId` once `activity` turns out to have an Activity Profile; with
 * no stream, or a failed call, the ride is drawn from its detected intervals,
 * with no error.
 */
export function useDetailedProfile(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary'>,
  activityId: string | null,
  activity: ActivityDetails | undefined,
): DetailedProfileState {
  const { credentials } = useIntervalsAvailability();
  const settingsQuery = useQuery(athleteSettingsQueryOptions(credentials));
  // Only a ride with an Activity Profile is drawn, so only its stream is read.
  const streamActivityId =
    activity !== undefined &&
    !activity.isStravaActivity &&
    activity.profileSummary !== null
      ? activityId
      : null;
  const streamQuery = useQuery(
    activityStreamQueryOptions(credentials, streamActivityId),
  );

  if (settingsQuery.isPending) return { source: null, isSettled: false };

  const settings = settingsQuery.data ?? FALLBACK_RIDE_SETTINGS;
  const rideSettled = streamActivityId === null || !streamQuery.isPending;
  const card = buildProfileCard(
    workout,
    rideSettled ? activity : undefined,
    settings.ftp,
    streamQuery.data ?? null,
  );

  return {
    source: card && { card, settings },
    isSettled: rideSettled,
  };
}
