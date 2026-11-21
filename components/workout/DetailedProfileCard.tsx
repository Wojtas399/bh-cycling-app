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
  plotTestID: string;
}

export default function DetailedProfileCard({
  source: { card, settings },
  plotTestID,
}: DetailedProfileCardProps) {
  const [width, setWidth] = useState(0);

  return (
    <View onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
      {width > 0 && (
        <LaidOutProfile
          profile={buildDetailedProfile(card, settings)}
          width={width}
          plotTestID={plotTestID}
        />
      )}
    </View>
  );
}

function LaidOutProfile({
  profile,
  width,
  plotTestID,
}: {
  profile: DetailedProfile;
  width: number;
  plotTestID: string;
}) {
  const { t } = useTranslation();
  const [pointerSeconds, setPointerSeconds] = useState<number | null>(null);
  const { strips, accessibilityLabel } = profilePlot(profile, t);

  return (
    <Box gap="base">
      <ProfileWithTimeAxis
        strips={strips}
        scale={profile.scale}
        durationSeconds={profile.durationSeconds}
        width={width}
        accessibilityLabel={accessibilityLabel}
        pointerShown={pointerSeconds !== null}
        onScrub={setPointerSeconds}
        testID={plotTestID}
      />
      {pointerSeconds !== null && (
        <ScrubReadout
          readout={profileReadout(profile, pointerSeconds)}
          onHidePointer={() => setPointerSeconds(null)}
          plotTestID={plotTestID}
        />
      )}
      <TimeInZoneRows rows={profile.timeInZone} />
    </Box>
  );
}
