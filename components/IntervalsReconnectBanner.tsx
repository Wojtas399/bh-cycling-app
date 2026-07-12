import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useNeedsReconnect } from '@/hooks/useNeedsReconnect';
import { useRouter } from 'expo-router';

export default function IntervalsReconnectBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const needsReconnect = useNeedsReconnect();
  const { handleConnect } = useIntervalsAuth();

  if (!needsReconnect) return null;

  function handlePress() {
    router.push('/(app)/(tabs)/settings');
    void handleConnect();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Box
        backgroundColor="warning"
        paddingVertical="sm"
        paddingHorizontal="base"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="body-s-regular" color="textInverse">
          {t('intervals.reconnectBanner.message')}
        </Text>
        <Text variant="body-s-medium" color="textInverse">
          {t('intervals.reconnectBanner.action')}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}
