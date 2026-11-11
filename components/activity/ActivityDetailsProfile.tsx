import WorkoutDetailsProfile from '@/components/workout/WorkoutDetailsProfile';
import type { ProfileCardSource } from '@/hooks/useDetailedProfile';

export interface ActivityDetailsProfileProps {
  /** A card with the recorded strip alone. */
  source: ProfileCardSource;
}

/**
 * The Activity Profile over its elapsed time, stops included: the same card
 * as Workout Details', with the ride alone. Read by a screen reader as one
 * summary.
 */
export default function ActivityDetailsProfile({
  source,
}: ActivityDetailsProfileProps) {
  return (
    <WorkoutDetailsProfile source={source} testID="activity-details-profile" />
  );
}
