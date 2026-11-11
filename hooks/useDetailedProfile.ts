import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import type { ActivityDetails } from '@/lib/activityDetails';
import {
  type DetailedProfile,
  buildDetailedProfile,
} from '@/lib/detailedProfile';
import { athleteSettingsQueryOptions } from '@/lib/intervalsQueries';
import { buildProfileCard } from '@/lib/profileCard';
import { resolveRideSettings } from '@/lib/rideSettings';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

/** Coggan's zones and no FTP, as Workout Profiles fall back to elsewhere. */
const FALLBACK_RIDE_SETTINGS = resolveRideSettings(null);

/**
 * The large profile card of `workout` above `activity` (see
 * `buildProfileCard`), with its scale from the athlete's current Ride
 * settings. Home, the Calendar and Workout Details fill those settings
 * already, so they're almost always cached. `null` while they first load, so
 * the card never redraws from %FTP to watts, and when neither side has a
 * profile. When the settings failed, the card is drawn on Coggan's zones in
 * %FTP.
 */
export function useDetailedProfile(
  workout: Pick<WorkoutDetails, 'blocks' | 'profileSummary' | 'zoneTimes'>,
  activity: ActivityDetails | undefined,
): DetailedProfile | null {
  const { credentials } = useIntervalsAvailability();
  const { data, isPending } = useQuery(
    athleteSettingsQueryOptions(credentials),
  );

  if (isPending) return null;

  const settings = data ?? FALLBACK_RIDE_SETTINGS;
  const card = buildProfileCard(workout, activity, settings.ftp);

  return card && buildDetailedProfile(card, settings);
}
