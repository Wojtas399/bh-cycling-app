import { useTranslation } from 'react-i18next';

import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import type { ActivityProfileSummary } from '@/lib/activityDetails';
import { formatDuration } from '@/lib/formatDuration';
import type { ProfileCard } from '@/lib/profileCard';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';

export interface WorkoutDetailsProfileProps {
  card: ProfileCard;
}

/**
 * The large profile card: the planned Workout Profile above the recorded
 * Activity Profile when there's both, either alone otherwise. Read by a screen
 * reader as one summary covering whatever it shows.
 */
export default function WorkoutDetailsProfile({
  card: { durationSeconds, recorded, planned },
}: WorkoutDetailsProfileProps) {
  const { t } = useTranslation();

  function recordedLabel(summary: ActivityProfileSummary) {
    return t('activityDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      segments: t('activityDetails.segments', { count: summary.segmentCount }),
      peak: summary.peakFtpPct,
    });
  }

  function plannedLabel(summary: WorkoutProfileSummary) {
    return t('workoutDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      steps: t('workoutDetails.steps', { count: summary.stepCount }),
      peak: Math.round(summary.peakFtpPct),
    });
  }

  const recordedText = recorded && recordedLabel(recorded.summary);
  const plannedText = planned && plannedLabel(planned.summary);

  return (
    <ProfileWithTimeAxis
      strips={[
        ...(planned
          ? [
              {
                blocks: planned.blocks,
                caption: t('workoutDetails.strip.planned'),
              },
            ]
          : []),
        ...(recorded
          ? [
              {
                blocks: recorded.blocks,
                caption: t('workoutDetails.strip.recorded'),
              },
            ]
          : []),
      ]}
      durationSeconds={durationSeconds}
      accessibilityLabel={
        plannedText && recordedText
          ? t('workoutDetails.comparedProfilesLabel', {
              planned: plannedText,
              recorded: recordedText,
            })
          : // A card always has at least one strip.
            (plannedText ?? recordedText ?? '')
      }
      testID="workout-details-profile"
    />
  );
}
