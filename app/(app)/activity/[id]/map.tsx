import { useTranslation } from 'react-i18next';

import MessageWithBack from '@/components/MessageWithBack';
import ActivityLoadError from '@/components/activity/ActivityLoadError';
import ActivityUnavailable from '@/components/activity/ActivityUnavailable';
import RouteMapScreen from '@/components/workout/RouteMapScreen';
import { useActivityDetails } from '@/hooks/activity/useActivityDetails';
import { routeOf } from '@/lib/activityDetails';
import { useLocalSearchParams } from 'expo-router';

/** The full-screen Route map of an Unplanned Activity. */
export default function ActivityRouteMapScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useActivityDetails(id);
  const { data, isError, error } = details.query;

  return (
    <RouteMapScreen
      availability={details.availability}
      summary={routeOf(data)}
      noSummary={
        data?.isStravaActivity ? (
          <ActivityUnavailable />
        ) : (
          <MessageWithBack message={t('routeMissing')} />
        )
      }
      detailsError={
        isError ? (
          <ActivityLoadError
            error={error}
            onRetry={() => void details.refetch()}
          />
        ) : null
      }
      missingMessage={t('routeMissing')}
    />
  );
}
