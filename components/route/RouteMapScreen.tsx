import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import MessageWithBack from '@/components/MessageWithBack';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import RouteLoadError from '@/components/route/RouteLoadError';
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
/** The ✕'s distance below the safe area's top edge. */
const CLOSE_OFFSET = 8;
/** The chips' distance above the safe area's bottom edge. */
const CHIPS_OFFSET = 24;
/** Room the chips row takes: two lines of text plus padding. */
const CHIPS_HEIGHT = 72;
const CHIPS_GAP = 8;
/** The screen's horizontal margin for the ✕ and the chips. */
const EDGE = 16;
/** The gap between the map's accessibility image and the ✕ or the chips. */
const IMAGE_GAP = 8;
/** How far past the ✕ and the chips the camera keeps the Route. */
const CAMERA_CLEARANCE = 24;
/** The camera's room at the screen's sides. */
const CAMERA_SIDE_PADDING = 32;
/** The attribution ⓘ's distance from the screen's bottom-right corner. */
const ATTRIBUTION_INSET = 8;
const SKELETON_STYLE = { flex: 1 };

interface RouteMapScreenProps {
  /** The host details screen's Intervals.icu gate. */
  availability: IntervalsAvailability;
  /**
   * The host's Route summary once its details have loaded, `null` when they
   * have none. `undefined` while the details haven't loaded.
   */
  summary: RouteSummary | null | undefined;
  /** Shown when the details loaded with no Route summary. */
  noSummary: ReactNode;
  /** Shown when the details failed with no data, `null` otherwise. */
  detailsError: ReactNode;
  /** Said when the Activity turns out to have no Route. */
  missingMessage: string;
}

/**
 * The full-screen Route map, slid up over a details screen as a headerless
 * modal. Opened from the banner, both queries are cache hits; opened cold
 * (a deep link), it shows its own skeleton and error states. The ✕, Android
 * back and the iOS two-finger escape gesture close it.
 */
export default function RouteMapScreen({
  availability,
  summary,
  noSummary,
  detailsError,
  missingMessage,
}: RouteMapScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  function close() {
    router.back();
  }

  function body() {
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
        <RouteBody summary={summary} missingMessage={missingMessage} />
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
      {/* First in the tree, so focus starts on it; drawn above the map. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={close}
        hitSlop={8}
        style={{
          position: 'absolute',
          zIndex: 1,
          top: insets.top + CLOSE_OFFSET,
          left: EDGE,
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
          borderRadius: CLOSE_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bgTertiary,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
        }}
      >
        <Ionicons
          name="close"
          size={CLOSE_ICON_SIZE}
          color={theme.colors.textPrimary}
        />
      </Pressable>

      {body()}
    </View>
  );
}

/** The Route's states, once the details have a route summary. */
function RouteBody({
  summary,
  missingMessage,
}: {
  summary: RouteSummary;
  missingMessage: string;
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

  // The details exist, but the Activity turned out to have no Route.
  return (
    <Centered>
      <MessageWithBack message={missingMessage} />
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
  const insets = useSafeAreaInsets();
  const distance = formatRouteDistance(summary);
  const chips = routeChips(summary);
  const closeBottom = insets.top + CLOSE_OFFSET + CLOSE_SIZE;
  // The room kept clear above the screen's bottom edge for the chips.
  const chipsReserved = insets.bottom + CHIPS_OFFSET + CHIPS_HEIGHT;

  return (
    <>
      {/*
        The map as one image for the screen reader. It's framed between the
        ✕ and the chips, so focus moves ✕ → map → chips → ⓘ.
      */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          distance ? t('labelWithDistance', { distance }) : t('label')
        }
        pointerEvents="none"
        style={{
          position: 'absolute',
          zIndex: 1,
          top: closeBottom + IMAGE_GAP,
          left: 0,
          right: 0,
          bottom: chipsReserved + IMAGE_GAP,
        }}
      />

      {chips.length > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            zIndex: 1,
            left: EDGE,
            right: EDGE,
            bottom: insets.bottom + CHIPS_OFFSET,
            flexDirection: 'row',
            gap: CHIPS_GAP,
          }}
        >
          {chips.map(({ chip, value }) => (
            <Box
              key={chip}
              flex={1}
              backgroundColor="bgTertiary"
              borderRadius="lg"
              padding="md"
              accessible
              accessibilityLabel={t('chip', { label: t(chip), value })}
            >
              <Text variant="body-xs-regular" color="textSecondary">
                {t(chip)}
              </Text>
              <Text variant="body-l-semibold">{value}</Text>
            </Box>
          ))}
        </View>
      )}

      {/*
        Last in the tree, so its attribution ⓘ (kept focusable while the
        map's contents are hidden) comes after the chips; the other layers
        are drawn above it.
      */}
      <View style={StyleSheet.absoluteFill}>
        <RouteMap
          route={route}
          interactive
          padding={{
            top: closeBottom + CAMERA_CLEARANCE,
            right: CAMERA_SIDE_PADDING,
            bottom: chipsReserved + CAMERA_CLEARANCE,
            left: CAMERA_SIDE_PADDING,
          }}
          attributionPosition={{
            bottom: ATTRIBUTION_INSET,
            right: ATTRIBUTION_INSET,
          }}
        />
      </View>
    </>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box flex={1} justifyContent="center">
      {children}
    </Box>
  );
}
