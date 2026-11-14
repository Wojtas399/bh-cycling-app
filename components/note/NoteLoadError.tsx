import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import MessageWithBack from '@/components/MessageWithBack';
import { isNotFoundError } from '@/lib/intervalsApi';

/**
 * A failed Note: not found on intervals.icu (deleted, or not a Note), with a
 * way back, or any other error, with a retry.
 */
export default function NoteLoadError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'noteDetails' });

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
