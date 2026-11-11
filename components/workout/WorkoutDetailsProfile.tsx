import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import Box from '@/components/Box';
import ProfileWithTimeAxis, {
  plotWidthOf,
} from '@/components/workout/ProfileWithTimeAxis';
import ScrubReadout from '@/components/workout/ScrubReadout';
import TimeInZoneRows from '@/components/workout/TimeInZoneRows';
import type { ProfileCardSource } from '@/hooks/useDetailedProfile';
import type { ActivityProfileSummary } from '@/lib/activityDetails';
import {
  type DetailedProfile,
  type StripPower,
  buildDetailedProfile,
} from '@/lib/detailedProfile';
import { formatDuration } from '@/lib/formatDuration';
import { profileReadout } from '@/lib/profileReadout';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';

export interface WorkoutDetailsProfileProps {
  source: ProfileCardSource;
  testID?: string;
}

/**
 * The large profile card: the planned Workout Profile above the recorded
 * Activity Profile when there's both, either alone otherwise, with the scrub
 * readout and their time in zone below. Drawn once it's laid out, since a
 * ride's power stream is drawn for the plot's width. Read by a screen reader
 * as one summary covering whatever it shows, each strip with its power, then
 * the time-in-zone rows as text. The scrub isn't offered to a screen reader.
 */
export default function WorkoutDetailsProfile({
  source: { card, settings },
  testID = 'workout-details-profile',
}: WorkoutDetailsProfileProps) {
  const [width, setWidth] = useState(0);

  return (
    <View onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
      {width > 0 && (
        <LaidOutProfile
          profile={buildDetailedProfile(card, settings, plotWidthOf(width))}
          width={width}
          testID={testID}
        />
      )}
    </View>
  );
}

function LaidOutProfile({
  profile,
  width,
  testID,
}: {
  profile: DetailedProfile;
  width: number;
  testID: string;
}) {
  const { durationSeconds, scale, recorded, planned, timeInZone } = profile;
  const { t } = useTranslation();
  // The scrub pointer's time, in s; `null` while it's hidden.
  const [pointer, setPointer] = useState<number | null>(null);

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
    <Box gap="base">
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
        width={width}
        accessibilityLabel={
          plannedText && recordedText
            ? t('workoutDetails.comparedProfilesLabel', {
                planned: plannedText,
                recorded: recordedText,
              })
            : // A card always has at least one strip.
              (plannedText ?? recordedText ?? '')
        }
        pointerShown={pointer !== null}
        onScrub={setPointer}
        testID={testID}
      />
      {pointer !== null && (
        <ScrubReadout
          readout={profileReadout(profile, pointer)}
          onHide={() => setPointer(null)}
          testID={testID}
        />
      )}
      <TimeInZoneRows rows={timeInZone} />
    </Box>
  );
}
