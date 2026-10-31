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

/** One profile of the stack. */
export interface ProfileStripView {
  /** Widths are shares of the stack's `durationSeconds`. */
  blocks: WorkoutBlock[];
  /** What the strip shows, written above it when it shares the stack. */
  caption: string;
}

export interface ProfileWithTimeAxisProps {
  /** Profiles stacked top to bottom on one time scale. */
  strips: ProfileStripView[];
  /** The time the profiles span, in s. */
  durationSeconds: number;
  /** What a screen reader reads for the whole profile. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * One or more large profiles with a shared time axis beneath them, each
 * captioned when there's more than one. Static,
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
        <Box gap="xl">
          {strips.map(({ blocks, caption }) =>
            // A lone profile needs no caption: the card says what it is.
            strips.length > 1 ? (
              <Box key={caption} gap="xs">
                <Text variant="body-xs-medium" color="textSecondary">
                  {caption}
                </Text>
                <WorkoutProfile blocks={blocks} height={STACKED_STRIP_HEIGHT} />
              </Box>
            ) : (
              <WorkoutProfile
                key={caption}
                blocks={blocks}
                height={PROFILE_HEIGHT}
              />
            ),
          )}
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
