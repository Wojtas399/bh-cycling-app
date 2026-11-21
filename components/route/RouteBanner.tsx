import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import Box from '@/components/Box';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import RouteLoadError from '@/components/route/RouteLoadError';
import RouteSkeleton from '@/components/route/RouteSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useActivityRoute } from '@/hooks/useActivityRoute';
import { DarkGlassView, liquidGlassAvailable } from '@/lib/liquidGlass';
import type { Route, RouteSummary } from '@/lib/route';
import { formatRouteDistance } from '@/lib/routeChips';
import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';

const BANNER_HEIGHT = 240;

const ROUTE_CLEAR_OF_EDGES_AND_PILL = {
  top: 28,
  right: 28,
  bottom: 48,
  left: 28,
};

const PILL_STYLE = {
  position: 'absolute',
  right: 12,
  bottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 999,
} as const;

interface RouteBannerProps {
  mapHref: Href;
  summary: RouteSummary;
}

export default function RouteBanner({ mapHref, summary }: RouteBannerProps) {
  const { query, refetch } = useActivityRoute(summary.activityId);
  const bleed = useBleedPastScrollPadding();

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

  return null;
}

function useBleedPastScrollPadding() {
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
  const bleed = useBleedPastScrollPadding();
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
        <RouteMap
          route={route}
          routeFitPadding={ROUTE_CLEAR_OF_EDGES_AND_PILL}
          interactive={false}
        />
        <DistancePill>
          <Ionicons
            name="map-outline"
            size={14}
            color={theme.colors.textPrimary}
          />
          <Text variant="body-xs-medium">
            {distance ? t('pill', { distance }) : t('showMap')}
          </Text>
        </DistancePill>
      </View>
    </Pressable>
  );
}

function DistancePill({ children }: { children: ReactNode }) {
  const theme = useAppTheme();

  if (liquidGlassAvailable) {
    return <DarkGlassView style={PILL_STYLE}>{children}</DarkGlassView>;
  }

  const overlayReadableOverLightTiles = {
    backgroundColor: theme.colors.overlay,
  };

  return (
    <View style={[PILL_STYLE, overlayReadableOverLightTiles]}>{children}</View>
  );
}
