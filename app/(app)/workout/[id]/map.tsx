import { useTranslation } from 'react-i18next';

import RouteMapScreen from '@/components/workout/RouteMapScreen';
import WorkoutLoadError from '@/components/workout/WorkoutLoadError';
import WorkoutNotFound from '@/components/workout/WorkoutNotFound';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import { useLocalSearchParams } from 'expo-router';

/** The full-screen Route map of a completed Workout's Activity. */
export default function WorkoutRouteMapScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useWorkoutDetails(Number(id));
  const { data, isError, error } = details.query;

  return (
    <RouteMapScreen
      availability={details.availability}
      summary={data ? data.route : undefined}
      noSummary={<WorkoutNotFound />}
      detailsError={
        isError ? (
          <WorkoutLoadError
            error={error}
            onRetry={() => void details.refetch()}
          />
        ) : null
      }
      missingMessage={t('route.missing')}
    />
  );
}
