import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import { useRouter } from 'expo-router';

export default function IntervalsConnectPrompt() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'intervals.connectPrompt',
  });
  const router = useRouter();

  return (
    <MessageWithAction
      message={t('message')}
      actionLabel={t('action')}
      onAction={() => router.push('/(app)/(tabs)/settings')}
    />
  );
}
