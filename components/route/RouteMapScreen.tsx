import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import GlassControl from '@/components/GlassControl';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import MessageWithBack from '@/components/MessageWithBack';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import RouteLoadError from '@/components/route/RouteLoadError';
import RouteMapReadingOrder from '@/components/route/RouteMapReadingOrder';
import RouteSkeleton from '@/components/route/RouteSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useActivityRoute } from '@/hooks/useActivityRoute';
import type { IntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import type { Route, RouteSummary } from '@/lib/route';
import { formatRouteDistance, routeChips } from '@/lib/routeChips';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CLOSE_SIZE = 44;
const CLOSE_ICON_SIZE = 20;
const CLOSE_TOP_BELOW_SAFE_AREA = 8;
const CHIPS_BOTTOM_ABOVE_SAFE_AREA = 24;
const CHIPS_ROW_HEIGHT_FOR_TWO_LINES = 72;
const CHIPS_GAP = 8;
const SCREEN_EDGE_MARGIN = 16;
const MAP_IMAGE_GAP_TO_CONTROLS = 8;
const CAMERA_CLEARANCE_PAST_CONTROLS = 24;
const CAMERA_SIDE_PADDING = 32;
const ATTRIBUTION_CORNER_INSET = 8;
const DRAWN_ABOVE_MAP = 1;
const SKELETON_STYLE = { flex: 1 };

interface RouteMapScreenProps {
  availability: IntervalsAvailability;
  summary: RouteSummary | null | undefined;
  noSummary: ReactNode;
  detailsError: ReactNode;
  missingRouteMessage: string;
}

export default function RouteMapScreen({
  availability,
  summary,
  noSummary,
  detailsError,
  missingRouteMessage,
}: RouteMapScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  function close() {
    router.back();
  }

  function mapOrItsState() {
    if (availability === 'loading') {
      return <RouteSkeleton style={SKELETON_STYLE} />;
    }

    if (availability === 'unavailable') {
      return (
        <Centered>
          <IntervalsConnectPrompt />
        </Centered>
      );
    }

    if (summary !== undefined) {
      return summary ? (
        <RouteBody
          summary={summary}
          missingRouteMessage={missingRouteMessage}
        />
      ) : (
        <Centered>{noSummary}</Centered>
      );
    }

    if (detailsError) return <Centered>{detailsError}</Centered>;

    return <RouteSkeleton style={SKELETON_STYLE} />;
  }

  return (
    <View
      accessibilityViewIsModal
      onAccessibilityEscape={close}
      style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}
    >
      <RouteMapReadingOrder
        close={
          <View
            style={{
              position: 'absolute',
              zIndex: DRAWN_ABOVE_MAP,
              top: insets.top + CLOSE_TOP_BELOW_SAFE_AREA,
              left: SCREEN_EDGE_MARGIN,
            }}
          >
            <GlassControl
              placement="chrome"
              accessibilityLabel={t('common.close')}
              onPress={close}
              hitSlop={8}
              surfaceStyle={{
                width: CLOSE_SIZE,
                height: CLOSE_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="close"
                size={CLOSE_ICON_SIZE}
                color={theme.colors.textPrimary}
              />
            </GlassControl>
          </View>
        }
        map={mapOrItsState()}
      />
    </View>
  );
}

function RouteBody({
  summary,
  missingRouteMessage,
}: {
  summary: RouteSummary;
  missingRouteMessage: string;
}) {
  const { query, refetch } = useActivityRoute(summary.activityId);

  if (query.data)
    return <FullScreenRoute route={query.data} summary={summary} />;

  if (query.isPending) return <RouteSkeleton style={SKELETON_STYLE} />;

  if (query.isError) {
    return (
      <Centered>
        <RouteLoadError onRetry={() => void refetch()} />
      </Centered>
    );
  }

  return (
    <Centered>
      <MessageWithBack message={missingRouteMessage} />
    </Centered>
  );
}

function FullScreenRoute({
  route,
  summary,
}: {
  route: Route;
  summary: RouteSummary;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'route.map' });
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const distance = formatRouteDistance(summary);
  const chips = routeChips(summary);
  const closeBottom = insets.top + CLOSE_TOP_BELOW_SAFE_AREA + CLOSE_SIZE;
  const chipsClearanceAboveBottomEdge =
    insets.bottom +
    CHIPS_BOTTOM_ABOVE_SAFE_AREA +
    CHIPS_ROW_HEIGHT_FOR_TWO_LINES;

  return (
    <RouteMapReadingOrder
      mapImage={
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            distance ? t('labelWithDistance', { distance }) : t('label')
          }
          pointerEvents="none"
          style={{
            position: 'absolute',
            zIndex: DRAWN_ABOVE_MAP,
            top: closeBottom + MAP_IMAGE_GAP_TO_CONTROLS,
            left: 0,
            right: 0,
            bottom: chipsClearanceAboveBottomEdge + MAP_IMAGE_GAP_TO_CONTROLS,
          }}
        />
      }
      chips={
        chips.length > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              zIndex: DRAWN_ABOVE_MAP,
              left: SCREEN_EDGE_MARGIN,
              right: SCREEN_EDGE_MARGIN,
              bottom: insets.bottom + CHIPS_BOTTOM_ABOVE_SAFE_AREA,
              flexDirection: 'row',
              gap: CHIPS_GAP,
            }}
          >
            {chips.map(({ chip, value }) => (
              <GlassControl
                key={chip}
                placement="chrome"
                borderRadius="lg"
                accessible
                accessibilityLabel={t('chip', { label: t(chip), value })}
                surfaceStyle={{ flex: 1, padding: theme.spacing.md }}
              >
                <Text variant="body-xs-regular" color="textSecondary">
                  {t(chip)}
                </Text>
                <Text variant="body-l-semibold">{value}</Text>
              </GlassControl>
            ))}
          </View>
        )
      }
      map={
        <View style={StyleSheet.absoluteFill}>
          <RouteMap
            route={route}
            interactive
            routeFitPadding={{
              top: closeBottom + CAMERA_CLEARANCE_PAST_CONTROLS,
              right: CAMERA_SIDE_PADDING,
              bottom:
                chipsClearanceAboveBottomEdge + CAMERA_CLEARANCE_PAST_CONTROLS,
              left: CAMERA_SIDE_PADDING,
            }}
            attributionPosition={{
              bottom: ATTRIBUTION_CORNER_INSET,
              right: ATTRIBUTION_CORNER_INSET,
            }}
          />
        </View>
      }
    />
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box flex={1} justifyContent="center">
      {children}
    </Box>
  );
}
