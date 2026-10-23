import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';

/** A failed Route, with a retry of the Route alone. */
export default function RouteLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

  return (
    <MessageWithAction
      message={t('route.error')}
      actionLabel={t('retry')}
      onAction={onRetry}
    />
  );
}
