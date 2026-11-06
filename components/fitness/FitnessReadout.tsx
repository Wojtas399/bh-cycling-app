import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import type { AppTheme } from '@/constants/theme';
import type { FitnessReadout as Readout } from '@/lib/fitness';

/** The readout's columns, each with its series' colour on the chart. */
const COLUMNS: {
  key: Exclude<keyof Readout, 'date'>;
  dot: keyof AppTheme['colors'];
}[] = [
  { key: 'fitness', dot: 'chartFitness' },
  { key: 'fatigue', dot: 'chartFatigue' },
  { key: 'form', dot: 'chartForm' },
  { key: 'load', dot: 'neutral' },
];

/**
 * The row above the chart: a day's date, then its Fitness, Zmęczenie, Forma
 * and Obciążenie in four equal columns, each a dot and label over the value.
 */
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
