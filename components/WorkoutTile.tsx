import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';
import type { WorkoutStatus } from '@/lib/workoutStatus';

export interface WorkoutTileProps {
  title: string;
  dayLabel?: string;
  status?: WorkoutStatus;
  durationSeconds?: number;
  blocks?: WorkoutBlock[];
  completedWithStravaActivity?: boolean;
  onPress?: () => void;
}

export default function WorkoutTile({
  title,
  dayLabel,
  status,
  durationSeconds,
  blocks = [],
  completedWithStravaActivity = false,
  onPress,
}: WorkoutTileProps) {
  const { t } = useTranslation();
  const card = (
    <SheenSurface padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        {status !== undefined && (
          <Box marginRight="sm">
            <WorkoutStatusDot status={status} size={8} />
          </Box>
        )}
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        {dayLabel !== undefined && (
          <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
            {dayLabel}
          </Text>
        )}
      </Box>

      {durationSeconds !== undefined && (
        <Text
          variant="body-s-regular"
          color="textSecondary"
          marginTop="xs"
          testID="workout-tile-duration"
        >
          {formatDuration(durationSeconds)}
        </Text>
      )}

      {completedWithStravaActivity && (
        <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
          {t('common.stravaActivity')}
        </Text>
      )}

      {blocks.length > 0 && (
        <Box marginTop="md">
          <WorkoutProfile blocks={blocks} />
        </Box>
      )}
    </SheenSurface>
  );

  if (!onPress) return card;

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
