import { useTranslation } from 'react-i18next';

import MessageWithBack from '@/components/MessageWithBack';

/** A Workout that no longer exists on intervals.icu, with a way back. */
export default function WorkoutNotFound() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.notFound',
  });

  return <MessageWithBack title={t('title')} message={t('body')} />;
}
