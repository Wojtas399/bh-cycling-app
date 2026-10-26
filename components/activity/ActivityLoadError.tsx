import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import { isNotFoundError } from '@/lib/intervalsApi';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

  if (isNotFoundError(error)) {
    return (
      <MessageWithAction
        title={t('notFound.title')}
        message={t('notFound.body')}
        actionLabel={t('notFound.back')}
        onAction={() => router.back()}
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
