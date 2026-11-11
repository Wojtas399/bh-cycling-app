import WorkoutDetailsProfile from '@/components/workout/WorkoutDetailsProfile';
import type { DetailedProfile } from '@/lib/detailedProfile';

export interface ActivityDetailsProfileProps {
  /** A card with the recorded strip alone. */
  profile: DetailedProfile;
}

/**
 * The Activity Profile over its elapsed time, stops included: the same card
 * as Workout Details', with the ride alone. Read by a screen reader as one
 * summary.
 */
export default function ActivityDetailsProfile({
  profile,
}: ActivityDetailsProfileProps) {
  return (
    <WorkoutDetailsProfile
      profile={profile}
      testID="activity-details-profile"
    />
  );
}
