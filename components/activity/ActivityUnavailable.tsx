import { useTranslation } from 'react-i18next';

import MessageWithBack from '@/components/MessageWithBack';

/** A Strava Activity, which intervals.icu can't share, with a way back. */
export default function ActivityUnavailable() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'activityDetails.unavailable',
  });

  return <MessageWithBack title={t('title')} message={t('body')} />;
}
