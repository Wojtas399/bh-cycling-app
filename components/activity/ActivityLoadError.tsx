import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import MessageWithBack from '@/components/MessageWithBack';
import { isNotFoundError } from '@/lib/intervalsApi';

/**
 * A failed Activity: not found on intervals.icu, with a way back, or any
 * other error, with a retry.
 */
export default function ActivityLoadError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'activityDetails' });

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
