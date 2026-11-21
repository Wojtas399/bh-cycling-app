import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';

import Box from '@/components/Box';

export default function RouteSkeleton({
  style,
}: {
  style: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'route' });

  return (
    <Box
      backgroundColor="bgTertiary"
      style={style}
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    />
  );
}
