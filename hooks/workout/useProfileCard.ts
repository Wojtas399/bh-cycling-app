import { useDetailedProfile } from '@/hooks/useDetailedProfile';
import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useQuery } from '@tanstack/react-query';

/**
 * A loaded Workout's profile card (see `useDetailedProfile`). The paired
 * Activity's intervals come from Activity Details' own query, so the two
 * screens share its cache; until it loads, and if it fails, the card shows the
 * plan alone.
 */
export function useProfileCard(
  workout: Pick<
    WorkoutDetails,
    'blocks' | 'profileSummary' | 'recordedActivityId'
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

  return useDetailedProfile(workout, activity);
}
