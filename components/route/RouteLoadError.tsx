import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';

/** A failed Route, with a retry of the Route alone. */
export default function RouteLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'route' });

  return (
    <MessageWithAction
      message={t('error')}
      actionLabel={t('retry')}
      onAction={onRetry}
    />
  );
}
