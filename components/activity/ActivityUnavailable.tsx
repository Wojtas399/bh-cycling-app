import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import { useRouter } from 'expo-router';

/** A Strava Activity, which intervals.icu can't share, with a way back. */
export default function ActivityUnavailable() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'activityDetails.unavailable',
  });
  const router = useRouter();

  return (
    <MessageWithAction
      title={t('title')}
      message={t('body')}
      actionLabel={t('back')}
      onAction={() => router.back()}
    />
  );
}
