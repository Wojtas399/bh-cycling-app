import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import type { ProfileReadout } from '@/lib/profileReadout';

/** Room for the strip's caption, so every reading starts in line. */
const CAPTION_WIDTH = 80;

/** Where a strip draws nothing at the pointer. */
const NO_READING = '—';

export interface ScrubReadoutProps {
  readout: ProfileReadout;
  /** Hides the pointer, and with it the readout. */
  onHide: () => void;
  /** The card's: the readout is `{testID}-readout`. */
  testID: string;
}

/**
 * The scrub readout under the profile card: the pointer's time, then each
 * strip's zone and power there, or a dash where it draws nothing, captioned
 * when the card has more than one strip. "✕ Ukryj" hides it.
 */
export default function ScrubReadout({
  readout: { time, strips },
  onHide,
  testID,
}: ScrubReadoutProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Box
      backgroundColor="insetFill"
      borderRadius="md"
      padding="sm"
      gap="xs"
      testID={`${testID}-readout`}
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
          onPress={onHide}
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
              style={{ width: CAPTION_WIDTH }}
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
              {NO_READING}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
