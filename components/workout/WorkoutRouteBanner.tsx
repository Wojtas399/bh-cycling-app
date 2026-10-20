import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import Box from '@/components/Box';
import MessageWithAction from '@/components/MessageWithAction';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { useWorkoutRoute } from '@/hooks/workout/useWorkoutRoute';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import type { Route } from '@/lib/route';
import type { WorkoutRouteSummary } from '@/lib/workoutDetails';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const BANNER_HEIGHT = 240;

/** Keeps the Route clear of the banner's edges and of the pill below it. */
const CAMERA_PADDING = { top: 28, right: 28, bottom: 48, left: 28 };

/** The pill: dark, so it reads over any part of the map. */
const PILL_BACKGROUND = 'rgba(10, 10, 10, 0.8)';

/**
 * The Route banner at the top of a completed Workout: a 240 px static map,
 * edge to edge, with a distance pill. A skeleton holds its place while the
 * Route loads; it disappears when there turns out to be no Route. A failure
 * with no data shows a retry of the Route alone, at the same height; data wins
 * over an error, so a failed refresh keeps the map on screen.
 */
export default function WorkoutRouteBanner({
  summary,
}: {
  summary: WorkoutRouteSummary;
}) {
  const { query, refetch } = useWorkoutRoute(summary.activityId);

  if (query.data) return <Banner route={query.data} summary={summary} />;

  if (query.isError) return <BannerError onRetry={() => void refetch()} />;

  if (query.isPending) return <BannerSkeleton />;

  // No Route (`null`): the banner steps aside.
  return null;
}

/** Cancels the scroll content's horizontal and top padding. */
function useBleedStyle() {
  const theme = useAppTheme();

  return {
    height: BANNER_HEIGHT,
    marginHorizontal: -theme.spacing.sm,
    marginTop: -theme.spacing.base,
  };
}

function BannerSkeleton() {
  // The screen's own loading label, as the Workout Details skeleton uses.
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const bleed = useBleedStyle();

  return (
    <Box
      backgroundColor="bgTertiary"
      style={bleed}
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    />
  );
}

function BannerError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const bleed = useBleedStyle();

  return (
    <Box backgroundColor="bgSecondary" justifyContent="center" style={bleed}>
      <MessageWithAction
        message={t('route.error')}
        actionLabel={t('retry')}
        onAction={onRetry}
      />
    </Box>
  );
}

function Banner({
  route,
  summary,
}: {
  route: Route;
  summary: WorkoutRouteSummary;
}) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.route',
  });
  const theme = useAppTheme();
  const bleed = useBleedStyle();
  const router = useRouter();
  // Workout Details' event id, which keys the full-screen map too.
  const { id } = useLocalSearchParams<{ id: string }>();
  const distance =
    summary.distanceMeters !== undefined
      ? formatMetric('distance', summary.distanceMeters)
      : undefined;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/workout/[id]/map', params: { id } })
      }
      accessibilityRole="button"
      accessibilityLabel={
        distance ? t('titleWithDistance', { distance }) : t('title')
      }
      accessibilityHint={t('hint')}
      style={bleed}
    >
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ flex: 1 }}
      >
        <RouteMap route={route} padding={CAMERA_PADDING} interactive={false} />
        <View
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: PILL_BACKGROUND,
          }}
        >
          <Ionicons
            name="map-outline"
            size={14}
            color={theme.colors.textPrimary}
          />
          <Text variant="body-xs-medium">
            {distance ? t('pill', { distance }) : t('showMap')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
