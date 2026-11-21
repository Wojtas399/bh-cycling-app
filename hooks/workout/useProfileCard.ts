import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { type ProfileCardSource, profileCardSource } from '@/lib/profileCard';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

export function useProfileCard(
  workout: Pick<
    WorkoutDetails,
    | 'blocks'
    | 'profileSummary'
    | 'zoneTimes'
    | 'rideSettings'
    | 'recordedActivityId'
  >,
): ProfileCardSource | null {
  const { credentials } = useIntervalsAvailability();

  const { data: activity } = useQuery(
    activityDetailsQueryOptions(
      credentials,
      workout.recordedActivityId,
      buildActivityDetails,
    ),
  );

  return profileCardSource(workout, activity, workout.rideSettings);
}
