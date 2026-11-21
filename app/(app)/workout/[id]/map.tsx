import { useTranslation } from 'react-i18next';

import DetailsLoadError from '@/components/DetailsLoadError';
import RouteMapScreen from '@/components/route/RouteMapScreen';
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
          <DetailsLoadError
            keyPrefix="workoutDetails"
            error={error}
            onRetry={() => void details.refetch()}
          />
        ) : null
      }
      missingRouteMessage={t('routeMissing')}
    />
  );
}
