import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { type UnplannedActivity, activityMetrics } from '@/lib/calendarItems';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import { GENERIC_SPORT_ICON, sportIcon } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface ActivityTileProps {
  activity: UnplannedActivity;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /**
   * Opens the Activity's details. Ignored for a Strava Activity, which has
   * none, so its tile is never a button.
   */
  onPress?: () => void;
}

/**
 * Presentational card for an Unplanned Activity, styled like `WorkoutTile`:
 * a sport icon where a Workout has its status dot, the title and day label,
 * and a metrics line — e.g. `27m · 14,0 km · Obciążenie 26` — of whichever
 * metrics the Activity has. A Strava Activity has no name or sport, so it
 * reads "Aktywność ze Stravy" with a generic glyph. With `onPress` it's a
 * button, read by its content like a Workout tile; a Strava Activity's never
 * is.
 */
export default function ActivityTile({
  activity,
  dayLabel,
  onPress,
}: ActivityTileProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityTile' });
  const theme = useAppTheme();
  const { title, icon } = activity.isStravaActivity
    ? { title: t('stravaActivity'), icon: GENERIC_SPORT_ICON }
    : { title: activity.name, icon: sportIcon(activity.type) };
  const metrics = activityMetrics(activity).map(({ metric, value }) =>
    metric === 'load'
      ? t('load', { load: formatMetric(metric, value) })
      : formatMetric(metric, value),
  );

  const card = (
    <Box
      backgroundColor="bgSecondary"
      borderRadius="lg"
      padding="base"
      testID="activity-tile"
    >
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box marginRight="sm">
          <Ionicons
            name={icon}
            size={16}
            color={theme.colors.workoutDone}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Box>
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        {dayLabel !== undefined && (
          <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
            {dayLabel}
          </Text>
        )}
      </Box>

      {metrics.length > 0 && (
        <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
          {metrics.join(' · ')}
        </Text>
      )}
    </Box>
  );

  if (!onPress || activity.isStravaActivity) return card;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {card}
    </Pressable>
  );
}
