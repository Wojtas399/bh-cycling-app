import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useReconnectIntervals } from '@/hooks/useReconnectIntervals';

/**
 * Asks to reconnect Intervals.icu for the Wellness scope that Fitness and
 * Wellness are both read with, with no dismiss. "Połącz ponownie" opens
 * Settings and starts the connect flow.
 */
export default function WellnessScopePrompt() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.wellnessScopePrompt',
  });
  const reconnect = useReconnectIntervals();

  return (
    <Box gap="sm" alignItems="flex-start">
      <Text variant="body-s-regular" color="textSecondary">
        {t('message')}
      </Text>
      <TouchableOpacity
        onPress={reconnect}
        activeOpacity={0.8}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text variant="body-s-medium" color="accent">
          {t('action')}
        </Text>
      </TouchableOpacity>
    </Box>
  );
}
