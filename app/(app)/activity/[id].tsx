import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import DetailsLoadError from '@/components/DetailsLoadError';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import ActivityDetailsHero from '@/components/activity/ActivityDetailsHero';
import ActivityUnavailable from '@/components/activity/ActivityUnavailable';
import RaceDetailSheet from '@/components/race/RaceDetailSheet';
import RaceHeader from '@/components/race/RaceHeader';
import RouteBanner from '@/components/route/RouteBanner';
import ActivityMetricGrid from '@/components/workout/ActivityMetricGrid';
import DetailedProfileCard from '@/components/workout/DetailedProfileCard';
import ProfileCardSkeleton from '@/components/workout/ProfileCardSkeleton';
import WorkoutDescriptionCard from '@/components/workout/WorkoutDescriptionCard';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import WorkoutDetailsSkeleton from '@/components/workout/WorkoutDetailsSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useActivityDetails } from '@/hooks/activity/useActivityDetails';
import { usePairedRace } from '@/hooks/activity/usePairedRace';
import { useAthleteSettings } from '@/hooks/useAthleteSettings';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useIntervalsRefresh } from '@/hooks/useIntervalsRefresh';
import { useRaceSheet } from '@/hooks/useRaceSheet';
import { type ActivityDetails, pairedEventIdOf } from '@/lib/activityDetails';
import { buildProfileCard } from '@/lib/profileCard';
import type { Race } from '@/lib/races';
import { rideSettingsOrCoggan } from '@/lib/rideSettings';
import { useLocalSearchParams } from 'expo-router';

export default function ActivityDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query } = useActivityDetails(id);
  const { refreshing, refresh } = useIntervalsRefresh();
  const pairedRace = usePairedRace(pairedEventIdOf(query.data));
  const raceSheet = useRaceSheet();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');

  function bodyPreferringDataOverError() {
    const skeleton = <WorkoutDetailsSkeleton loadingLabel={t('loading')} />;

    if (availability === 'loading') return skeleton;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return query.data.isStravaActivity ? (
        <ActivityUnavailable />
      ) : (
        <ActivityDetailsContent
          activityId={id}
          details={query.data}
          loadedPairedRace={pairedRace.race}
          onRacePress={raceSheet.open}
        />
      );
    }

    if (query.isError) {
      return (
        <DetailsLoadError
          keyPrefix="activityDetails"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }

    return skeleton;
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
      <RaceDetailSheet sheet={raceSheet} />
    </Box>
  );
}

function ActivityDetailsContent({
  activityId,
  details,
  loadedPairedRace,
  onRacePress,
}: {
  activityId: string;
  details: Extract<ActivityDetails, { isStravaActivity: false }>;
  loadedPairedRace: Race | undefined;
  onRacePress: (race: Race) => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const settings = useAthleteSettings();
  const profile = buildProfileCard(
    { recorded: details.recorded },
    rideSettingsOrCoggan(settings.data),
  );
  const profileUnitsPending = settings.isLoading;

  return (
    <Box gap="md">
      {loadedPairedRace && (
        <RaceHeader race={loadedPairedRace} onPress={onRacePress} />
      )}

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
        sportType={details.type}
        startLocal={details.startLocal}
      />

      {profileUnitsPending ? (
        <ProfileCardSkeleton />
      ) : (
        profile && (
          <WorkoutDetailsCard>
            <DetailedProfileCard
              card={profile}
              plotTestID="activity-details-profile"
            />
          </WorkoutDetailsCard>
        )
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
