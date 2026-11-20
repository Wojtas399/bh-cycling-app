import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import MessageWithBack from '@/components/MessageWithBack';
import { isNotFoundError } from '@/lib/intervalsApi';

export default function DetailsLoadError({
  keyPrefix,
  error,
  onRetry,
}: {
  keyPrefix: 'workoutDetails' | 'activityDetails' | 'noteDetails';
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix });

  if (isNotFoundError(error)) {
    return (
      <MessageWithBack
        title={t('notFound.title')}
        message={t('notFound.body')}
      />
    );
  }

  return (
    <MessageWithAction
      message={t('error')}
      actionLabel={t('retry')}
      onAction={onRetry}
    />
  );
}
