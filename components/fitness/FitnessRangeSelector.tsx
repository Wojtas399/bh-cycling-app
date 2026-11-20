import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import GlassControl, { GLASS_EDGE } from '@/components/GlassControl';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { FITNESS_RANGES, type FitnessRange } from '@/lib/fitness';

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
  const { spacing } = useAppTheme();
  const segment = {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  } as const;

  return (
    <GlassControl
      placement="chrome"
      style={{ flexDirection: 'row', padding: spacing.xs }}
    >
      {FITNESS_RANGES.map(option => {
        const selected = option === range;
        const label = (
          <Text
            variant="body-s-medium"
            color={selected ? 'textInverse' : 'textSecondary'}
          >
            {t(option)}
          </Text>
        );

        return selected ? (
          <Box key={option} flex={1}>
            <GlassControl
              placement="chrome"
              prominent
              onPress={() => onRangeChange(option)}
              accessibilityState={{ selected }}
              style={segment}
            >
              {label}
            </GlassControl>
          </Box>
        ) : (
          <Pressable
            key={option}
            onPress={() => onRangeChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[{ flex: 1 }, segment, GLASS_EDGE]}
          >
            {label}
          </Pressable>
        );
      })}
    </GlassControl>
  );
}
