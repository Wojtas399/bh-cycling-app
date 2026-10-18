import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import type { UnplannedActivity } from '@/lib/calendarItems';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import { sportIcon } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface ActivityTileProps {
  activity: UnplannedActivity;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
}

/**
 * Presentational card for an Unplanned Activity, styled like `WorkoutTile`:
 * a sport icon where a Workout has its status dot, the title and day label,
 * and a metrics line — e.g. `27m · 14,0 km · Obciążenie 26` — of whichever
 * metrics the Activity has. Not tappable: there is no Activity Details
 * screen yet.
 */
export default function ActivityTile({
  activity,
  dayLabel,
}: ActivityTileProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityTile' });
  const theme = useAppTheme();
  const { durationSeconds, distanceMeters, load } = activity;
  const metrics = [
    durationSeconds !== undefined && formatMetric('duration', durationSeconds),
    distanceMeters !== undefined && formatMetric('distance', distanceMeters),
    load !== undefined && t('load', { load: formatMetric('load', load) }),
  ].filter(metric => metric !== false);

  return (
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
            name={sportIcon(activity.type)}
            size={16}
            color={theme.colors.workoutDone}
          />
        </Box>
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {activity.name}
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
}
