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
 * The large profile card: the recorded Activity Profile above the planned
 * Workout Profile when there's both, either alone otherwise. Read by a screen
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
      strips={[recorded, planned].flatMap(strip =>
        strip ? [strip.blocks] : [],
      )}
      durationSeconds={durationSeconds}
      accessibilityLabel={
        recordedText && plannedText
          ? t('workoutDetails.comparedProfilesLabel', {
              recorded: recordedText,
              planned: plannedText,
            })
          : // A card always has at least one strip.
            (recordedText ?? plannedText ?? '')
      }
      testID="workout-details-profile"
    />
  );
}
