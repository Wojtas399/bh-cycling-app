import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import Box from '@/components/Box';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import RouteLoadError from '@/components/route/RouteLoadError';
import RouteSkeleton from '@/components/route/RouteSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useActivityRoute } from '@/hooks/useActivityRoute';
import type { Route, RouteSummary } from '@/lib/route';
import { formatRouteDistance } from '@/lib/routeChips';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';

const BANNER_HEIGHT = 240;

/** Keeps the Route clear of the banner's edges and of the pill below it. */
const CAMERA_PADDING = { top: 28, right: 28, bottom: 48, left: 28 };

interface RouteBannerProps {
  /** Where a tap goes: the host screen's own full-screen Route map. */
  mapHref: Href;
  summary: RouteSummary;
}

/**
 * The Route banner at the top of a details screen: a 240 px static map, edge
 * to edge, with a distance pill. A skeleton holds its place while the Route
 * loads; it disappears when there turns out to be no Route. A failure with no
 * data shows a retry of the Route alone, at the same height; data wins over an
 * error, so a failed refresh keeps the map on screen.
 */
export default function RouteBanner({ mapHref, summary }: RouteBannerProps) {
  const { query, refetch } = useActivityRoute(summary.activityId);
  const bleed = useBleedStyle();

  if (query.data) {
    return <Banner mapHref={mapHref} route={query.data} summary={summary} />;
  }

  if (query.isError) {
    return (
      <Box backgroundColor="bgTertiary" justifyContent="center" style={bleed}>
        <RouteLoadError onRetry={() => void refetch()} />
      </Box>
    );
  }

  if (query.isPending) return <RouteSkeleton style={bleed} />;

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

function Banner({
  mapHref,
  route,
  summary,
}: RouteBannerProps & { route: Route }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'route' });
  const theme = useAppTheme();
  const bleed = useBleedStyle();
  const router = useRouter();
  const distance = formatRouteDistance(summary);

  return (
    <Pressable
      onPress={() => router.push(mapHref)}
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
        {/* The pill: dark, so it reads over any part of the map. */}
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
            backgroundColor: theme.colors.overlay,
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
