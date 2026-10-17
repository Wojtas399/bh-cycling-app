import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import Button from '@/components/Button';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import WorkoutActivityCard from '@/components/workout/WorkoutActivityCard';
import WorkoutComparisonCard from '@/components/workout/WorkoutComparisonCard';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsHero from '@/components/workout/WorkoutDetailsHero';
import WorkoutDetailsProfile from '@/components/workout/WorkoutDetailsProfile';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import WorkoutPlanCard from '@/components/workout/WorkoutPlanCard';
import { useAppTheme } from '@/constants/theme';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import { IntervalsApiError } from '@/lib/intervalsApi';
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
      return query.error instanceof IntervalsApiError &&
        query.error.status === 404 ? (
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

      {details.description !== undefined && (
        <WorkoutDescriptionCard description={details.description} />
      )}
    </Box>
  );
}

function NotFound() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.notFound',
  });
  const router = useRouter();

  return (
    <Box padding="lg" alignItems="center" gap="base">
      <Text variant="h3" textAlign="center">
        {t('title')}
      </Text>
      <Text variant="body-l-regular" color="textSecondary" textAlign="center">
        {t('body')}
      </Text>
      <Button
        variant="secondary"
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text variant="body-l-semibold">{t('back')}</Text>
      </Button>
    </Box>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <Box padding="lg" alignItems="center" gap="base">
      <Text variant="body-l-regular" color="textSecondary" textAlign="center">
        {t('error')}
      </Text>
      <Button
        variant="secondary"
        onPress={onRetry}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text variant="body-l-semibold">{t('retry')}</Text>
      </Button>
    </Box>
  );
}
