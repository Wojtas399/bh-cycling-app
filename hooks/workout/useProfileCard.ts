import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { type ProfileCard, buildProfileCard } from '@/lib/profileCard';
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
): ProfileCard | null {
  const { query } = useIntervalsRead({
    queryOptions: activityDetailsQueryOptions,
    args: [workout.recordedActivityId],
    select: buildActivityDetails,
    selectArgs: [],
  });
  const { blocks, profileSummary, zoneTimes } = workout;
  const activity = query.data;

  return buildProfileCard(
    {
      ...(profileSummary && {
        planned: { blocks, summary: profileSummary, zoneTimes },
      }),
      ...(activity &&
        !activity.isStravaActivity && { recorded: activity.recorded }),
    },
    workout.rideSettings,
  );
}
