import { useDetailedProfile } from '@/hooks/useDetailedProfile';
import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

/**
 * A loaded Workout's profile card (see `useDetailedProfile`). The paired
 * Activity's intervals and power stream come from Activity Details' own
 * queries, so the two screens share their cache; until both have settled, and
 * if the Activity fails, the card shows the plan alone.
 */
export function useProfileCard(
  workout: Pick<
    WorkoutDetails,
    'blocks' | 'profileSummary' | 'zoneTimes' | 'recordedActivityId'
  >,
) {
  const { credentials } = useIntervalsAvailability();

  const { data: activity } = useQuery(
    activityDetailsQueryOptions(
      credentials,
      workout.recordedActivityId,
      buildActivityDetails,
    ),
  );

  return useDetailedProfile(workout, workout.recordedActivityId, activity)
    .source;
}
