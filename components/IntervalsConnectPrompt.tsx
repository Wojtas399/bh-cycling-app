import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Button from '@/components/Button';
import Text from '@/components/Text';
import { useRouter } from 'expo-router';

/**
 * Asks the athlete to connect (or reconnect) Intervals.icu, linking to the
 * Settings tab where the connection lives.
 */
export default function IntervalsConnectPrompt() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.connectPrompt',
  });
  const router = useRouter();

  return (
    <Box padding="lg" alignItems="center" gap="base">
      <Text variant="body-l-regular" color="textSecondary" textAlign="center">
        {t('message')}
      </Text>
      <Button
        variant="secondary"
        onPress={() => router.push('/(app)/(tabs)/settings')}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text variant="body-l-semibold">{t('action')}</Text>
      </Button>
    </Box>
  );
}
