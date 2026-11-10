import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import SkeletonBar from '@/components/SkeletonBar';

const COLUMNS = ['fitness', 'fatigue', 'form', 'load'] as const;

/**
 * Grey blocks where the readout and the chart will be, announced as busy.
 * Sized to the readout's lines, so it fills in without a jump.
 */
export default function FitnessChartSkeleton() {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness' });

  return (
    <Box
      flex={1}
      gap="base"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      <Box gap="xs">
        <SkeletonBar width={40} height={14} marginVertical={3} onPage />
        <Box flexDirection="row">
          {COLUMNS.map(key => (
            <Box key={key} flex={1}>
              <SkeletonBar width={64} height={10} marginVertical={3} onPage />
              <SkeletonBar width={36} height={20} marginVertical={4} onPage />
            </Box>
          ))}
        </Box>
      </Box>

      <Box flex={1} backgroundColor="bgTertiary" borderRadius="md" />
    </Box>
  );
}
