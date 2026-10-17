import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import MessageWithAction from '@/components/MessageWithAction';
import ScreenHeader from '@/components/ScreenHeader';
import WorkoutActivityCard from '@/components/workout/WorkoutActivityCard';
import WorkoutComparisonCard from '@/components/workout/WorkoutComparisonCard';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsHero from '@/components/workout/WorkoutDetailsHero';
import WorkoutDetailsProfile from '@/components/workout/WorkoutDetailsProfile';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import WorkoutDetailsSteps from '@/components/workout/WorkoutDetailsSteps';
import WorkoutPlanCard from '@/components/workout/WorkoutPlanCard';
import { useAppTheme } from '@/constants/theme';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import { isNotFoundError } from '@/lib/intervalsApi';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useLocalSearchParams, useRouter } from 'expo-router';

/**
 * Workout Details: one Workout, pushed over the tabs from any Workout tile.
 * Branches on the raw query (ADR 0005): data wins over an error, so a failed
 * pull-to-refresh keeps the Workout on screen.
 */
export default function WorkoutDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query, refetch } = useWorkoutDetails(Number(id));
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function body() {
    if (availability === 'loading') return <WorkoutDetailsSkeleton />;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) return <WorkoutDetailsContent details={query.data} />;

    if (query.isError) {
      return isNotFoundError(query.error) ? (
        <NotFound />
      ) : (
        <LoadError onRetry={() => void query.refetch()} />
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
 * The loaded Workout, Variant A: hero, then stacked cards. The mode-specific
 * metrics, Kroki and Opis cards slot in below the profile.
 */
function WorkoutDetailsContent({ details }: { details: WorkoutDetails }) {
  return (
    <Box gap="md">
      <WorkoutDetailsHero
        status={details.status}
        title={details.title}
        date={details.date}
      />

      {details.profileSummary && (
        <WorkoutDetailsCard>
          <WorkoutDetailsProfile
            blocks={details.blocks}
            summary={details.profileSummary}
          />
        </WorkoutDetailsCard>
      )}

      {details.mode === 'planned' && (
        <WorkoutPlanCard metrics={details.planMetrics} />
      )}

      {details.comparison && (
        <WorkoutComparisonCard comparison={details.comparison} />
      )}
      {details.activityMetrics && (
        <WorkoutActivityCard metrics={details.activityMetrics} />
      )}

      {details.steps.length > 0 && <KrokiCard steps={details.steps} />}

      {details.description !== undefined && (
        <WorkoutDescriptionCard description={details.description} />
      )}
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

function NotFound() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.notFound',
  });
  const router = useRouter();

  return (
    <MessageWithAction
      title={t('title')}
      message={t('body')}
      actionLabel={t('back')}
      onAction={() => router.back()}
    />
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <MessageWithAction
      message={t('error')}
      actionLabel={t('retry')}
      onAction={onRetry}
    />
  );
}
