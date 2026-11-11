import { useTranslation } from 'react-i18next';

import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import type { ActivityProfileSummary } from '@/lib/activityDetails';
import type { DetailedProfile, StripPower } from '@/lib/detailedProfile';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';

export interface WorkoutDetailsProfileProps {
  profile: DetailedProfile;
  testID?: string;
}

/**
 * The large profile card: the planned Workout Profile above the recorded
 * Activity Profile when there's both, either alone otherwise. Read by a screen
 * reader as one summary covering whatever it shows, each strip with its power.
 */
export default function WorkoutDetailsProfile({
  profile: { durationSeconds, scale, recorded, planned },
  testID = 'workout-details-profile',
}: WorkoutDetailsProfileProps) {
  const { t } = useTranslation();

  function powerLabel({ unit, peak, average }: StripPower) {
    return t(`workoutDetails.profilePower.${unit}`, { peak, average });
  }

  function recordedLabel(summary: ActivityProfileSummary, power: StripPower) {
    return t('activityDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      segments: t('activityDetails.segments', { count: summary.segmentCount }),
      peak: summary.peakFtpPct,
      power: powerLabel(power),
    });
  }

  function plannedLabel(summary: WorkoutProfileSummary, power: StripPower) {
    return t('workoutDetails.profileLabel', {
      duration: formatDuration(summary.durationSeconds),
      steps: t('workoutDetails.steps', { count: summary.stepCount }),
      peak: Math.round(summary.peakFtpPct),
      power: powerLabel(power),
    });
  }

  const recordedText =
    recorded && recordedLabel(recorded.summary, recorded.power);
  const plannedText = planned && plannedLabel(planned.summary, planned.power);

  return (
    <ProfileWithTimeAxis
      strips={[
        ...(planned
          ? [
              {
                segments: planned.segments,
                caption: t('workoutDetails.strip.planned'),
              },
            ]
          : []),
        ...(recorded
          ? [
              {
                segments: recorded.segments,
                caption: t('workoutDetails.strip.recorded'),
              },
            ]
          : []),
      ]}
      scale={scale}
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
      testID={testID}
    />
  );
}
