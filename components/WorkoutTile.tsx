import Box from '@/components/Box';
import Text from '@/components/Text';
import { formatDuration } from '@/lib/formatDuration';

export interface WorkoutTileProps {
  title: string;
  dayLabel: string;
  durationSeconds?: number;
}

/**
 * Presentational card for a single workout. Renders the title and a
 * today/tomorrow label on the top row, with the duration below in muted text.
 * Knows nothing about intervals.icu, is non-interactive, and degrades
 * gracefully when the duration is absent. The Workout Profile lands later.
 */
export default function WorkoutTile({
  title,
  dayLabel,
  durationSeconds,
}: WorkoutTileProps) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
          {dayLabel}
        </Text>
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
    </Box>
  );
}
