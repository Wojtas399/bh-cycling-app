import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import type { ProfileReadout } from '@/lib/profileReadout';

const CAPTION_WIDTH_ALIGNING_READINGS = 80;

const NOTHING_DRAWN_AT_POINTER = '—';

export interface ScrubReadoutProps {
  readout: ProfileReadout;
  onHidePointer: () => void;
  plotTestID: string;
}

export default function ScrubReadout({
  readout: { time, strips },
  onHidePointer,
  plotTestID,
}: ScrubReadoutProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Box
      backgroundColor="insetFill"
      borderRadius="md"
      padding="sm"
      gap="xs"
      testID={`${plotTestID}-readout`}
    >
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text
          variant="body-xs-medium"
          color="textPrimary"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {time}
        </Text>
        <Pressable
          onPress={onHidePointer}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('workoutDetails.readout.hide')}
        >
          <Text variant="body-xs-medium" color="textSecondary">
            {`✕ ${t('workoutDetails.readout.hide')}`}
          </Text>
        </Pressable>
      </Box>
      {strips.map(({ side, reading }) => (
        <Box key={side} flexDirection="row" gap="sm">
          {strips.length > 1 && (
            <Text
              variant="body-xs-medium"
              color="textSecondary"
              style={{ width: CAPTION_WIDTH_ALIGNING_READINGS }}
            >
              {t(`workoutDetails.strip.${side}`)}
            </Text>
          )}
          {reading ? (
            <Text variant="body-xs-regular" color="textPrimary">
              <Text
                variant="body-xs-medium"
                style={{ color: colors[ZONE_COLORS[reading.zone]] }}
              >
                Z{reading.zone}
              </Text>
              {` · ${reading.power}`}
            </Text>
          ) : (
            <Text variant="body-xs-regular" color="textTertiary">
              {NOTHING_DRAWN_AT_POINTER}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
