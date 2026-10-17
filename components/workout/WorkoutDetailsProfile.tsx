import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutProfile from '@/components/WorkoutProfile';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';
import type { WorkoutBlock } from '@/lib/workoutProfile';

const PROFILE_HEIGHT = 120;

/** Where the time-axis labels sit, as shares of the Workout's duration. */
const AXIS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

export interface WorkoutDetailsProfileProps {
  blocks: WorkoutBlock[];
  summary: WorkoutProfileSummary;
}

/**
 * The large Workout Profile with a time axis beneath it. Static, and read by
 * a screen reader as one element with a summary; the blocks are hidden.
 */
export default function WorkoutDetailsProfile({
  blocks,
  summary,
}: WorkoutDetailsProfileProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  const label = t('profileLabel', {
    duration: formatDuration(summary.durationSeconds),
    steps: t('steps', { count: summary.stepCount }),
    peak: Math.round(summary.peakFtpPct),
  });

  return (
    <Box
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="workout-details-profile"
    >
      <Box importantForAccessibility="no-hide-descendants">
        <WorkoutProfile blocks={blocks} height={PROFILE_HEIGHT} />
        <Box flexDirection="row" justifyContent="space-between" marginTop="xs">
          {AXIS_FRACTIONS.map(fraction => (
            <Text key={fraction} variant="body-xs-regular" color="textTertiary">
              {formatDuration(summary.durationSeconds * fraction)}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
