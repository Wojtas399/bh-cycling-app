import { useTranslation } from 'react-i18next';

import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';
import type { WorkoutBlock } from '@/lib/workoutProfile';

export interface WorkoutDetailsProfileProps {
  blocks: WorkoutBlock[];
  summary: WorkoutProfileSummary;
}

/** The large Workout Profile, read by a screen reader as one summary. */
export default function WorkoutDetailsProfile({
  blocks,
  summary,
}: WorkoutDetailsProfileProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <ProfileWithTimeAxis
      blocks={blocks}
      durationSeconds={summary.durationSeconds}
      accessibilityLabel={t('profileLabel', {
        duration: formatDuration(summary.durationSeconds),
        steps: t('steps', { count: summary.stepCount }),
        peak: Math.round(summary.peakFtpPct),
      })}
      testID="workout-details-profile"
    />
  );
}
