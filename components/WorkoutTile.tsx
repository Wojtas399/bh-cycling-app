import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import WorkoutStatusDot from '@/components/WorkoutStatusDot';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';
import type { WorkoutStatus } from '@/lib/workoutStatus';

export interface WorkoutTileProps {
  title: string;
  /** Omitted where the surrounding screen already shows the day. */
  dayLabel?: string;
  /** Draws a Workout Status dot before the title when given. */
  status?: WorkoutStatus;
  durationSeconds?: number;
  /** The Workout Profile to draw. Empty when there is none to show. */
  blocks?: WorkoutBlock[];
}

/**
 * Presentational card for a single workout. Renders the title — with a status
 * dot and a day label, when given — on the top row, the duration below in
 * muted text, and the Workout Profile beneath that. Knows nothing about intervals.icu, is
 * non-interactive, and degrades to whichever parts it was given.
 */
export default function WorkoutTile({
  title,
  dayLabel,
  status,
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

      {blocks.length > 0 && (
        <Box marginTop="md">
          <WorkoutProfile blocks={blocks} />
        </Box>
      )}
    </Box>
  );
}
