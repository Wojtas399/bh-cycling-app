import { useTranslation } from 'react-i18next';

import MessageWithAction from '@/components/MessageWithAction';
import { useRouter } from 'expo-router';

/**
 * A screen with nothing to show, such as something that no longer exists,
 * with a "Wróć" button back to where the user came from.
 */
export default function MessageWithBack({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <MessageWithAction
      title={title}
      message={message}
      actionLabel={t('common.goBack')}
      onAction={() => router.back()}
    />
  );
}
