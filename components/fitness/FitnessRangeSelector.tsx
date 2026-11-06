import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { FITNESS_RANGES, type FitnessRange } from '@/lib/fitness';

/** Segmented control choosing the chart's range: 6 tygodni, 3 miesiące, rok. */
export default function FitnessRangeSelector({
  range,
  onRangeChange,
}: {
  range: FitnessRange;
  onRangeChange: (range: FitnessRange) => void;
}) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'fitness.chart.ranges',
  });

  return (
    <Box
      flexDirection="row"
      backgroundColor="bgSecondary"
      borderRadius="md"
      padding="xs"
    >
      {FITNESS_RANGES.map(option => {
        const selected = option === range;

        return (
          <Pressable
            key={option}
            style={{ flex: 1 }}
            onPress={() => onRangeChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Box
              alignItems="center"
              paddingVertical="sm"
              borderRadius="sm"
              backgroundColor={selected ? 'bgTertiary' : 'transparent'}
            >
              <Text
                variant="body-s-medium"
                color={selected ? 'textPrimary' : 'textSecondary'}
              >
                {t(option)}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
}
