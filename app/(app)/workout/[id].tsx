import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import DetailsLoadError from '@/components/DetailsLoadError';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import RouteBanner from '@/components/route/RouteBanner';
import DetailedProfileCard from '@/components/workout/DetailedProfileCard';
import WorkoutActivityCard from '@/components/workout/WorkoutActivityCard';
import WorkoutComparisonCard from '@/components/workout/WorkoutComparisonCard';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsHero from '@/components/workout/WorkoutDetailsHero';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import WorkoutDetailsSteps from '@/components/workout/WorkoutDetailsSteps';
import WorkoutPlanCard from '@/components/workout/WorkoutPlanCard';
import WorkoutStravaCard from '@/components/workout/WorkoutStravaCard';
import { useAppTheme } from '@/constants/theme';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useIntervalsRefresh } from '@/hooks/useIntervalsRefresh';
import { useProfileCard } from '@/hooks/workout/useProfileCard';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import type { WorkoutDetails } from '@/lib/workoutDetails';
import { useLocalSearchParams } from 'expo-router';

export default function WorkoutDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query } = useWorkoutDetails(Number(id));
  const { refreshing, refresh } = useIntervalsRefresh();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');

  function bodyPreferringDataOverError() {
    if (availability === 'loading') return <WorkoutDetailsSkeleton />;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return <WorkoutDetailsContent eventId={id} details={query.data} />;
    }

    if (query.isError) {
      return (
        <DetailsLoadError
          keyPrefix="workoutDetails"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }

    return <WorkoutDetailsSkeleton />;
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScrollView
        {...header.scrollViewProps}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          paddingTop: header.scrollInsetTop + theme.spacing.base,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        refreshControl={
          availability === 'available' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={header.scrollInsetTop}
            />
          ) : undefined
        }
      >
        {bodyPreferringDataOverError()}
      </ScrollView>
      <ScreenHeader title={t('title')} onLayout={header.onLayout} />
    </Box>
  );
}

function WorkoutDetailsContent({
  eventId,
  details,
}: {
  eventId: string;
  details: WorkoutDetails;
}) {
  const profile = useProfileCard(details);
  const noActivityNumbersToCompare = details.comparison === null;
  const description = details.description !== undefined && (
    <WorkoutDescriptionCard description={details.description} asNoteMarkdown />
  );

  return (
    <Box gap="md">
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

      {profile && (
        <WorkoutDetailsCard>
          <DetailedProfileCard
            card={profile}
            plotTestID="workout-details-profile"
          />
        </WorkoutDetailsCard>
      )}

      {details.stravaActivity && (
        <WorkoutStravaCard activity={details.stravaActivity} />
      )}

      {noActivityNumbersToCompare && (
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
