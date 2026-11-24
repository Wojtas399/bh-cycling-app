import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { type ProfileCard, buildProfileCard } from '@/lib/profileCard';
import type { WorkoutDetails } from '@/lib/workoutDetails';

export function useProfileCard(
  workout: Pick<
    WorkoutDetails,
    'rideSteps' | 'rideSettings' | 'recordedActivityId'
  >,
): ProfileCard | null {
  const { query } = useIntervalsRead({
    queryOptions: activityDetailsQueryOptions,
    args: [workout.recordedActivityId],
    select: buildActivityDetails,
    selectArgs: [],
  });
  const activity = query.data;

  return buildProfileCard(
    {
      planned: workout.rideSteps,
      ...(activity &&
        !activity.isStravaActivity && { recorded: activity.recorded }),
    },
    workout.rideSettings,
  );
}
