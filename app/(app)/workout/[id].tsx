import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import RouteBanner from '@/components/route/RouteBanner';
import WorkoutActivityCard from '@/components/workout/WorkoutActivityCard';
import WorkoutComparisonCard from '@/components/workout/WorkoutComparisonCard';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsHero from '@/components/workout/WorkoutDetailsHero';
import WorkoutDetailsProfile from '@/components/workout/WorkoutDetailsProfile';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import WorkoutDetailsSteps from '@/components/workout/WorkoutDetailsSteps';
import WorkoutLoadError from '@/components/workout/WorkoutLoadError';
import WorkoutPlanCard from '@/components/workout/WorkoutPlanCard';
import WorkoutStravaCard from '@/components/workout/WorkoutStravaCard';
import { useAppTheme } from '@/constants/theme';
import { useActivityRoute } from '@/hooks/useActivityRoute';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useLocalSearchParams } from 'expo-router';

/**
 * Workout Details: one Workout, pushed over the tabs from any Workout tile.
 * Branches on the raw query (ADR 0005): data wins over an error, so a failed
 * pull-to-refresh keeps the Workout on screen.
 */
export default function WorkoutDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query, refetch } = useWorkoutDetails(Number(id));
  // The same Route query the banner reads, so a refresh can retry it. The
  // summary is `null` in planned mode, so this is skipped there.
  const route = useActivityRoute(query.data?.route?.activityId ?? null);
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
    if (availability === 'loading') return <WorkoutDetailsSkeleton />;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return <WorkoutDetailsContent eventId={id} details={query.data} />;
    }

    if (query.isError) {
      return (
        <WorkoutLoadError
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }

    return <WorkoutDetailsSkeleton />;
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
 * The loaded Workout, Variant A: hero, then stacked cards. On a Cycling
 * Workout the mode-specific metrics, Kroki and Opis cards slot in below the
 * profile. A non-cycling Workout's description is its content, so Opis leads,
 * straight under the hero.
 */
function WorkoutDetailsContent({
  eventId,
  details,
}: {
  eventId: string;
  details: WorkoutDetails;
}) {
  const description = details.description !== undefined && (
    <WorkoutDescriptionCard description={details.description} markdown />
  );

  return (
    <Box gap="md">
      {/* `route` is `null` in planned mode. */}
      {details.route && (
        <RouteBanner
          mapHref={{ pathname: '/workout/[id]/map', params: { id: eventId } }}
          summary={details.route}
        />
      )}

      <WorkoutDetailsHero
        status={details.status}
        title={details.title}
        date={details.date}
      />

      {!details.isCyclingWorkout && description}

      {details.profileSummary && (
        <WorkoutDetailsCard>
          <WorkoutDetailsProfile
            blocks={details.blocks}
            summary={details.profileSummary}
          />
        </WorkoutDetailsCard>
      )}

      {details.stravaActivity && (
        <WorkoutStravaCard activity={details.stravaActivity} />
      )}

      {/* With no Activity numbers to compare, the plan is shown on its own. */}
      {details.comparison === null && (
        <WorkoutPlanCard metrics={details.planMetrics} />
      )}

      {details.comparison && (
        <WorkoutComparisonCard comparison={details.comparison} />
      )}
      {details.activityMetrics && (
        <WorkoutActivityCard metrics={details.activityMetrics} />
      )}

      {details.steps.length > 0 && <KrokiCard steps={details.steps} />}

      {details.isCyclingWorkout && description}
    </Box>
  );
}

function KrokiCard({ steps }: { steps: WorkoutDetails['steps'] }) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.kroki',
  });

  return (
    <WorkoutDetailsCard title={t('title')}>
      <WorkoutDetailsSteps steps={steps} />
    </WorkoutDetailsCard>
  );
}
