import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import WorkoutNotFound from '@/components/workout/WorkoutNotFound';
import { isNotFoundError } from '@/lib/intervalsApi';

/**
 * A failed Workout: not found on intervals.icu, with a way back, or any other
 * error, with a retry.
 */
export default function WorkoutLoadError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  if (isNotFoundError(error)) return <WorkoutNotFound />;

  return (
    <MessageWithAction
      message={t('error')}
      actionLabel={t('retry')}
      onAction={onRetry}
    />
  );
}
