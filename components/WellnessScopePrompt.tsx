import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { useReconnectIntervals } from '@/hooks/useReconnectIntervals';

export default function WellnessScopePrompt() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.wellnessScopePrompt',
  });
  const reconnect = useReconnectIntervals();

  return (
    <SheenSurface padding="base" gap="sm" alignItems="flex-start">
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
    </SheenSurface>
  );
}
