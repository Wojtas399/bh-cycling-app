import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { FITNESS_SERIES_COLORS } from '@/components/fitness/fitnessSeriesColors';
import type { AppTheme } from '@/constants/theme';
import type { FitnessReadout as Readout } from '@/lib/fitness';

const COLUMNS: {
  key: Exclude<keyof Readout, 'date'>;
  dot: keyof AppTheme['colors'];
}[] = [
  { key: 'fitness', dot: FITNESS_SERIES_COLORS.fitness },
  { key: 'fatigue', dot: FITNESS_SERIES_COLORS.fatigue },
  { key: 'form', dot: FITNESS_SERIES_COLORS.form },
  { key: 'load', dot: 'neutral' },
];

export default function FitnessReadout({ readout }: { readout: Readout }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness' });

  return (
    <Box gap="xs">
      <Text variant="body-s-medium" color="textSecondary">
        {readout.date}
      </Text>
      <Box flexDirection="row">
        {COLUMNS.map(({ key, dot }) => (
          <Box key={key} flex={1}>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Box
                backgroundColor={dot}
                borderRadius="full"
                style={{ width: 8, height: 8 }}
              />
              <Text variant="body-xs-regular" color="textSecondary">
                {t(`labels.${key}`)}
              </Text>
            </Box>
            <Text variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
              {readout[key]}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
