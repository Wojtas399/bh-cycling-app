import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutBlock } from '@/lib/workoutProfile';

const PROFILE_HEIGHT = 120;

/** Each strip's height when two share the card, so it grows only a little. */
const STACKED_STRIP_HEIGHT = 80;

/** Where the time-axis labels sit, as shares of the profile's duration. */
const AXIS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

export interface ProfileWithTimeAxisProps {
  /**
   * Profiles stacked top to bottom on one time scale, each one's widths
   * shares of `durationSeconds`.
   */
  strips: WorkoutBlock[][];
  /** The time the profiles span, in s. */
  durationSeconds: number;
  /** What a screen reader reads for the whole profile. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * One or more large profiles with a shared time axis beneath them. Static,
 * and read by a screen reader as one image with `accessibilityLabel`; the
 * blocks are hidden.
 */
export default function ProfileWithTimeAxis({
  strips,
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
        <Box gap="sm">
          {strips.map((blocks, index) => (
            <WorkoutProfile
              // A fixed stack, never reordered.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              blocks={blocks}
              height={strips.length > 1 ? STACKED_STRIP_HEIGHT : PROFILE_HEIGHT}
            />
          ))}
        </Box>
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
