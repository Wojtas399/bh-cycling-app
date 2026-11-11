import { useActivityStream } from '@/hooks/activity/useActivityStream';
import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { buildActivityDetails, profileStreamIdOf } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { type ProfileCardSource, profileCardSource } from '@/lib/profileCard';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

/**
 * A loaded Workout's profile card (see `profileCardSource`), drawn by the Ride
 * settings the Workout was read with. The paired Activity's intervals and
 * power stream come from Activity Details' own queries, so the two screens
 * share their cache. Until both have settled, and if the Activity fails, the
 * card shows the plan alone.
 */
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
  const stream = useActivityStream(
    profileStreamIdOf(workout.recordedActivityId, activity),
  );

  // The ride waits for its stream, so it never redraws from its intervals.
  return profileCardSource(
    workout,
    stream.isLoading ? undefined : activity,
    workout.rideSettings,
    stream.data,
  );
}
