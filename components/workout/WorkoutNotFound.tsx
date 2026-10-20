import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import { useRouter } from 'expo-router';

/** A Workout that no longer exists on intervals.icu, with a way back. */
export default function WorkoutNotFound() {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.notFound',
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
