import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { type ProfileCardSource, profileCardSource } from '@/lib/profileCard';
import type { WorkoutDetails } from '@/lib/workoutDetails';

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
  const { query } = useIntervalsRead({
    queryOptions: activityDetailsQueryOptions,
    args: [workout.recordedActivityId],
    select: buildActivityDetails,
    selectArgs: [],
  });

  return profileCardSource(workout, query.data, workout.rideSettings);
}
