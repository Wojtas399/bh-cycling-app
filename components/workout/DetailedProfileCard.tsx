import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import Box from '@/components/Box';
import ProfileWithTimeAxis from '@/components/workout/ProfileWithTimeAxis';
import ScrubReadout from '@/components/workout/ScrubReadout';
import TimeInZoneRows from '@/components/workout/TimeInZoneRows';
import type { ProfileCard } from '@/lib/profileCard';
import { profilePlot } from '@/lib/profilePlot';
import { profileReadout } from '@/lib/profileReadout';

export interface DetailedProfileCardProps {
  card: ProfileCard;
  plotTestID: string;
}

export default function DetailedProfileCard({
  card,
  plotTestID,
}: DetailedProfileCardProps) {
  const [width, setWidth] = useState(0);

  return (
    <View onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
      {width > 0 && (
        <LaidOutProfile card={card} width={width} plotTestID={plotTestID} />
      )}
    </View>
  );
}

function LaidOutProfile({
  card,
  width,
  plotTestID,
}: {
  card: ProfileCard;
  width: number;
  plotTestID: string;
}) {
  const { t } = useTranslation();
  const [pointerSeconds, setPointerSeconds] = useState<number | null>(null);
  const { strips, accessibilityLabel } = profilePlot(card, t);

  return (
    <Box gap="base">
      <ProfileWithTimeAxis
        strips={strips}
        scale={card.scale}
        durationSeconds={card.durationSeconds}
        width={width}
        accessibilityLabel={accessibilityLabel}
        pointerShown={pointerSeconds !== null}
        onScrub={setPointerSeconds}
        testID={plotTestID}
      />
      {pointerSeconds !== null && (
        <ScrubReadout
          readout={profileReadout(card, pointerSeconds)}
          onHidePointer={() => setPointerSeconds(null)}
          plotTestID={plotTestID}
        />
      )}
      <TimeInZoneRows rows={card.timeInZone} />
    </Box>
  );
}
