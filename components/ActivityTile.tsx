import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { type UnplannedActivity, activityMetrics } from '@/lib/calendarItems';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import { GENERIC_SPORT_ICON, sportIcon } from '@/lib/sportIcon';
import { Ionicons } from '@expo/vector-icons';

export interface ActivityTileProps {
  activity: UnplannedActivity;
  dayLabel?: string;
  onPress?: () => void;
}

export default function ActivityTile({
  activity,
  dayLabel,
  onPress,
}: ActivityTileProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { title, icon } = activity.isStravaActivity
    ? { title: t('common.stravaActivity'), icon: GENERIC_SPORT_ICON }
    : { title: activity.name, icon: sportIcon(activity.type) };
  const metrics = activityMetrics(activity).map(({ metric, value }) =>
    metric === 'load'
      ? t('activityTile.load', { load: formatMetric(metric, value) })
      : formatMetric(metric, value),
  );

  const card = (
    <SheenSurface padding="base" testID="activity-tile">
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
    </SheenSurface>
  );

  const opensDetails = onPress && !activity.isStravaActivity;

  if (!opensDetails) return card;

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
