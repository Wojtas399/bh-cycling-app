import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';

import Box from '@/components/Box';

/**
 * The placeholder a Route map holds while the Route loads, announced with the
 * screen's own loading label, as the Workout Details skeleton is. The caller
 * sizes it.
 */
export default function RouteSkeleton({
  style,
}: {
  style: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'workoutDetails' });

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
