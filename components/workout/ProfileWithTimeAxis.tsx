import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';

const PROFILE_HEIGHT = 120;

/** Where the time-axis labels sit, as shares of the profile's duration. */
const AXIS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

export interface ProfileWithTimeAxisProps {
  blocks: WorkoutBlock[];
  /** The time the profile spans, in s. */
  durationSeconds: number;
  /** What a screen reader reads for the whole profile. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * A large profile with a time axis beneath it. Static, and read by a screen
 * reader as one image with `accessibilityLabel`; the blocks are hidden.
 */
export default function ProfileWithTimeAxis({
  blocks,
  durationSeconds,
  accessibilityLabel,
  testID,
}: ProfileWithTimeAxisProps) {
  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Box importantForAccessibility="no-hide-descendants">
        <WorkoutProfile blocks={blocks} height={PROFILE_HEIGHT} />
        <Box flexDirection="row" justifyContent="space-between" marginTop="xs">
          {AXIS_FRACTIONS.map(fraction => (
            <Text key={fraction} variant="body-xs-regular" color="textTertiary">
              {formatDuration(durationSeconds * fraction)}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
