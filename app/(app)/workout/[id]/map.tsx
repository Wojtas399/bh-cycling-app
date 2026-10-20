import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import MessageWithAction from '@/components/MessageWithAction';
import RouteMap from '@/components/RouteMap';
import Text from '@/components/Text';
import WorkoutNotFound from '@/components/workout/WorkoutNotFound';
import { useAppTheme } from '@/constants/theme';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import { useWorkoutRoute } from '@/hooks/workout/useWorkoutRoute';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import { isNotFoundError } from '@/lib/intervalsApi';
import { formatLocalTime } from '@/lib/localDateTime';
import type { Route } from '@/lib/route';
import type { WorkoutRouteSummary } from '@/lib/workoutDetails';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const CLOSE_SIZE = 44;
/** The ✕'s distance below the safe area's top edge. */
const CLOSE_OFFSET = 8;
/** The chips' distance above the safe area's bottom edge. */
const CHIPS_OFFSET = 24;
/** Room the chips row takes: two lines of text plus padding. */
const CHIPS_HEIGHT = 72;
const EDGE = 16;

/**
 * The full-screen Route map, slid up over Workout Details as a headerless
 * modal. Opened from the banner, both queries are cache hits; opened cold
 * (a deep link), it shows its own skeleton and error states. The ✕, Android
 * back and the iOS two-finger escape gesture close it.
 */
export default function WorkoutRouteMapScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const details = useWorkoutDetails(Number(id));
  const summary = details.query.data?.route ?? null;

  function close() {
    router.back();
  }

  function body() {
    if (details.availability === 'loading') return <MapSkeleton />;

    if (details.availability === 'unavailable') {
      return (
        <Centered>
          <IntervalsConnectPrompt />
        </Centered>
      );
    }

    if (details.query.data) {
      return summary ? (
        <RouteBody summary={summary} />
      ) : (
        <Centered>
          <WorkoutNotFound />
        </Centered>
      );
    }

    if (details.query.isError) {
      return (
        <Centered>
          {isNotFoundError(details.query.error) ? (
            <WorkoutNotFound />
          ) : (
            <MessageWithAction
              message={t('workoutDetails.error')}
              actionLabel={t('workoutDetails.retry')}
              onAction={() => void details.refetch()}
            />
          )}
        </Centered>
      );
    }

    return <MapSkeleton />;
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
        <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
      </Pressable>

      {body()}
    </View>
  );
}

/** The Route's states, once the details have a route summary. */
function RouteBody({ summary }: { summary: WorkoutRouteSummary }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });
  const { query, refetch } = useWorkoutRoute(summary.activityId);

  if (query.data)
    return <FullScreenRoute route={query.data} summary={summary} />;

  if (query.isPending) return <MapSkeleton />;

  if (query.isError) {
    return (
      <Centered>
        <MessageWithAction
          message={t('route.error')}
          actionLabel={t('retry')}
          onAction={() => void refetch()}
        />
      </Centered>
    );
  }

  // The Activity turned out to have no Route.
  return (
    <Centered>
      <WorkoutNotFound />
    </Centered>
  );
}

function FullScreenRoute({
  route,
  summary,
}: {
  route: Route;
  summary: WorkoutRouteSummary;
}) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.routeMap',
  });
  const insets = useSafeAreaInsets();
  const distance =
    summary.distanceMeters !== undefined
      ? formatMetric('distance', summary.distanceMeters)
      : undefined;
  // A chip with no value is left out.
  const chips: { label: string; value: string }[] = (
    [
      [t('distance'), distance],
      [t('start'), formatLocalTime(summary.startLocal)],
      [
        t('finish'),
        summary.finishLocal && formatLocalTime(summary.finishLocal),
      ],
    ] satisfies [string, string | undefined][]
  ).flatMap(([label, value]) => (value ? [{ label, value }] : []));
  const chipsTop = insets.bottom + CHIPS_OFFSET + CHIPS_HEIGHT;

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
          distance ? t('mapWithDistance', { distance }) : t('map')
        }
        pointerEvents="none"
        style={{
          position: 'absolute',
          zIndex: 1,
          top: insets.top + CLOSE_OFFSET + CLOSE_SIZE + 8,
          left: 0,
          right: 0,
          bottom: chipsTop + 8,
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
            gap: 8,
          }}
        >
          {chips.map(({ label, value }) => (
            <Box
              key={label}
              flex={1}
              backgroundColor="bgTertiary"
              borderRadius="lg"
              padding="md"
              accessible
              accessibilityLabel={t('chip', { label, value })}
            >
              <Text variant="body-xs-regular" color="textSecondary">
                {label}
              </Text>
              <Text variant="body-l-semibold">{value}</Text>
            </Box>
          ))}
        </View>
      )}

      {/*
        Last in the tree, so its attribution ⓘ (kept focusable, default
        label) comes after the chips; the other layers are drawn above it.
      */}
      <View style={StyleSheet.absoluteFill}>
        <RouteMap
          route={route}
          interactive
          padding={{
            top: insets.top + CLOSE_OFFSET + CLOSE_SIZE + 24,
            right: 32,
            bottom: chipsTop + 24,
            left: 32,
          }}
          attributionPosition={{ bottom: 8, right: 8 }}
        />
      </View>
    </>
  );
}

function MapSkeleton() {
  // The screen's own loading label, as the banner skeleton uses.
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <Box
      flex={1}
      backgroundColor="bgTertiary"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box flex={1} justifyContent="center">
      {children}
    </Box>
  );
}
