import { useTranslation } from 'react-i18next';

import MessageWithBack from '@/components/MessageWithBack';

export default function WorkoutNotFound() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.notFound',
  });

  return <MessageWithBack title={t('title')} message={t('body')} />;
}
