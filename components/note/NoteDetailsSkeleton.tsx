import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import SkeletonBar from '@/components/SkeletonBar';

export default function NoteDetailsSkeleton() {
  const { t } = useTranslation(undefined, { keyPrefix: 'noteDetails' });

  return (
    <Box
      paddingHorizontal="md"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      <Box gap="base">
        <SkeletonBar width="70%" height={32} onPage />
        <SkeletonBar width={160} height={14} onPage />
        <Box height={1} backgroundColor="borderDefault" />
      </Box>
      <Box gap="sm" marginTop="lg">
        <SkeletonBar width="100%" height={16} onPage />
        <SkeletonBar width="90%" height={16} onPage />
        <SkeletonBar width="60%" height={16} onPage />
      </Box>
    </Box>
  );
}
