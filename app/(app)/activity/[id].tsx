import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import ActivityDetailsHero from '@/components/activity/ActivityDetailsHero';
import ActivityDetailsProfile from '@/components/activity/ActivityDetailsProfile';
import ActivityLoadError from '@/components/activity/ActivityLoadError';
import ActivityUnavailable from '@/components/activity/ActivityUnavailable';
import ActivityMetricGrid from '@/components/workout/ActivityMetricGrid';
import RouteBanner from '@/components/workout/RouteBanner';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useActivityDetails } from '@/hooks/activity/useActivityDetails';
import { useActivityRoute } from '@/hooks/useActivityRoute';
import type { ActivityDetails } from '@/lib/activityDetails';
import { useLocalSearchParams } from 'expo-router';

/**
 * Activity Details: one Unplanned Activity, pushed over the tabs from its
 * tile. Mirrors Workout Details and branches on the raw query (ADR 0005):
 * data wins over an error, so a failed pull-to-refresh keeps the Activity on
 * screen.
 */
export default function ActivityDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query, refetch } = useActivityDetails(id);
  // The same Route query the banner reads, so a refresh can retry it. It's
  // skipped when there's no Route.
  const route = useActivityRoute(
    query.data && !query.data.isStravaActivity
      ? (query.data.route?.activityId ?? null)
      : null,
  );
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      // A loaded Route is never fetched again; a failed one is retried.
      await Promise.all([refetch(), route.refetchIfFailed()]);
    } finally {
      setRefreshing(false);
    }
  }

  function body() {
    const skeleton = <WorkoutDetailsSkeleton label={t('loading')} />;

    if (availability === 'loading') return skeleton;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return query.data.isStravaActivity ? (
        <ActivityUnavailable />
      ) : (
        <ActivityDetailsContent activityId={id} details={query.data} />
      );
    }

    if (query.isError) {
      return (
        <ActivityLoadError
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }

    return skeleton;
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScreenHeader title={t('title')} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          paddingTop: theme.spacing.base,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        refreshControl={
          availability === 'available' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
            />
          ) : undefined
        }
      >
        {body()}
      </ScrollView>
    </Box>
  );
}

/**
 * The loaded Activity, Variant A: the Route banner, the hero, the Activity
 * Profile, then Podsumowanie and Opis.
 */
function ActivityDetailsContent({
  activityId,
  details,
}: {
  activityId: string;
  details: Extract<ActivityDetails, { isStravaActivity: false }>;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });

  return (
    <Box gap="md">
      {/* `route` is `null` for a trainer ride, a VirtualRide or no GPS. */}
      {details.route && (
        <RouteBanner
          mapHref={{
            pathname: '/activity/[id]/map',
            params: { id: activityId },
          }}
          summary={details.route}
        />
      )}

      <ActivityDetailsHero
        title={details.title}
        type={details.type}
        startLocal={details.startLocal}
      />

      {details.profileSummary && (
        <WorkoutDetailsCard>
          <ActivityDetailsProfile
            blocks={details.blocks}
            summary={details.profileSummary}
          />
        </WorkoutDetailsCard>
      )}

      {details.metrics.length > 0 && (
        <WorkoutDetailsCard title={t('summary')}>
          <ActivityMetricGrid metrics={details.metrics} />
        </WorkoutDetailsCard>
      )}

      {details.description !== undefined && (
        <WorkoutDescriptionCard description={details.description} />
      )}
    </Box>
  );
}
