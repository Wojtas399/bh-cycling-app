import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import Box from '@/components/Box';
import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import ScrubReadout from '@/components/workout/ScrubReadout';
import TimeInZoneRows from '@/components/workout/TimeInZoneRows';
import {
  type DetailedProfile,
  buildDetailedProfile,
} from '@/lib/detailedProfile';
import type { ProfileCardSource } from '@/lib/profileCard';
import { profilePlot } from '@/lib/profilePlot';
import { profileReadout } from '@/lib/profileReadout';

export interface DetailedProfileCardProps {
  source: ProfileCardSource;
  /** The plot's; the scrub readout is `{testID}-readout`. */
  testID: string;
}

/**
 * The large profile card of Workout Details and Activity Details: the
 * planned Workout Profile above the recorded Activity Profile when there's
 * both, either alone otherwise, with the scrub readout and their time in zone
 * below. Drawn once it's laid out, for the plot's width. Read by a screen
 * reader as one summary covering whatever it shows, each strip with its
 * power, then the time-in-zone rows as text.
 * The scrub isn't offered to a screen reader.
 */
export default function DetailedProfileCard({
  source: { card, settings },
  testID,
}: DetailedProfileCardProps) {
  const [width, setWidth] = useState(0);

  return (
    <View onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
      {width > 0 && (
        <LaidOutProfile
          profile={buildDetailedProfile(card, settings)}
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
  const { t } = useTranslation();
  // The scrub pointer's time, in s; `null` while it's hidden.
  const [pointer, setPointer] = useState<number | null>(null);
  const { strips, accessibilityLabel } = profilePlot(profile, t);

  return (
    <Box gap="base">
      <ProfileWithTimeAxis
        strips={strips}
        scale={profile.scale}
        durationSeconds={profile.durationSeconds}
        width={width}
        accessibilityLabel={accessibilityLabel}
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
      <TimeInZoneRows rows={profile.timeInZone} />
    </Box>
  );
}
