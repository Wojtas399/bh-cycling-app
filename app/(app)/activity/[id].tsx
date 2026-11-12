import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import ScreenHeader from '@/components/ScreenHeader';
import ActivityDetailsHero from '@/components/activity/ActivityDetailsHero';
import ActivityLoadError from '@/components/activity/ActivityLoadError';
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
import { useActivityRoute } from '@/hooks/useActivityRoute';
import { useAthleteSettings } from '@/hooks/useAthleteSettings';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useRaceSheet } from '@/hooks/useRaceSheet';
import {
  type ActivityDetails,
  pairedEventIdOf,
  routeOf,
} from '@/lib/activityDetails';
import { NO_WORKOUT_PROFILE, profileCardSource } from '@/lib/profileCard';
import type { Race } from '@/lib/races';
import { useLocalSearchParams } from 'expo-router';

/**
 * Activity Details: one Unplanned Activity or paired Race, pushed over the
 * tabs from its tile. Mirrors Workout Details and branches on the raw query
 * (ADR 0005): data wins over an error, so a failed pull-to-refresh keeps the
 * Activity on screen. An Activity paired to a Race gets the Race header,
 * which opens the Race Detail Sheet.
 */
export default function ActivityDetailsScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query, refetch } = useActivityDetails(id);
  // The same Route query the banner reads, so a refresh can retry it. It's
  // skipped when there's no Route.
  const route = useActivityRoute(routeOf(query.data)?.activityId ?? null);
  // Skipped when the Activity isn't paired.
  const pairedRace = usePairedRace(pairedEventIdOf(query.data));
  const raceSheet = useRaceSheet();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      // A loaded Route is never fetched again; a failed one is retried.
      await Promise.all([
        refetch(),
        route.refetchIfFailed(),
        pairedRace.refetch(),
      ]);
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
        <ActivityDetailsContent
          activityId={id}
          details={query.data}
          race={pairedRace.race}
          onRacePress={raceSheet.open}
        />
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
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={header.scrollInsetTop}
            />
          ) : undefined
        }
      >
        {body()}
      </ScrollView>
      <ScreenHeader title={t('title')} onLayout={header.onLayout} />
      <RaceDetailSheet sheet={raceSheet} />
    </Box>
  );
}

/**
 * The loaded Activity: the Race header when it's paired to a Race, the Route
 * banner, the hero, the Activity Profile, then Podsumowanie and Opis.
 */
function ActivityDetailsContent({
  activityId,
  details,
  race,
  onRacePress,
}: {
  activityId: string;
  details: Extract<ActivityDetails, { isStravaActivity: false }>;
  /** Undefined until the paired Race loads, and when there is none. */
  race: Race | undefined;
  onRacePress: (race: Race) => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });
  const settings = useAthleteSettings();
  const profile = profileCardSource(NO_WORKOUT_PROFILE, details, settings.data);

  return (
    <Box gap="md">
      {race && <RaceHeader race={race} onPress={onRacePress} />}

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

      {/* Held until the ride can be drawn as it'll stay: in watts or %FTP. */}
      {settings.isLoading ? (
        <ProfileCardSkeleton />
      ) : (
        profile && (
          <WorkoutDetailsCard>
            <DetailedProfileCard
              source={profile}
              testID="activity-details-profile"
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
