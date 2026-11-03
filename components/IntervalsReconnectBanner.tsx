import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useNeedsReconnect } from '@/hooks/useNeedsReconnect';
import { useReconnectIntervals } from '@/hooks/useReconnectIntervals';

export default function IntervalsReconnectBanner() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.reconnectBanner',
  });
  const needsReconnect = useNeedsReconnect();
  const reconnect = useReconnectIntervals();

  if (!needsReconnect) return null;

  return (
    <TouchableOpacity onPress={reconnect} activeOpacity={0.8}>
      <Box
        backgroundColor="warning"
        paddingVertical="sm"
        paddingHorizontal="base"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="body-s-regular" color="textInverse">
          {t('message')}
        </Text>
        <Text variant="body-s-medium" color="textInverse">
          {t('action')}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}
