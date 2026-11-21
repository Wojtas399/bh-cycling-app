import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';

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
