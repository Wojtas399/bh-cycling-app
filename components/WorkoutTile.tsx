import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';

export interface WorkoutTileProps {
  title: string;
  dayLabel: string;
  durationSeconds?: number;
  /** The Workout Profile to draw. Empty when there is none to show. */
  blocks?: WorkoutBlock[];
}

/**
 * Presentational card for a single workout. Renders the title and a
 * today/tomorrow label on the top row, the duration below in muted text, and
 * the Workout Profile beneath that. Knows nothing about intervals.icu, is
 * non-interactive, and degrades to whichever parts it was given.
 */
export default function WorkoutTile({
  title,
  dayLabel,
  durationSeconds,
  blocks = [],
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

      {blocks.length > 0 && (
        <Box marginTop="md">
          <WorkoutProfile blocks={blocks} />
        </Box>
      )}
    </Box>
  );
}
