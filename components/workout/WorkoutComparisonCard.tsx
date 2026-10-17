import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import {
  formatComparisonDifference,
  formatComparisonValue,
} from '@/components/workout/formatWorkoutMetric';
import type { WorkoutComparison } from '@/lib/workoutDetails';

export interface WorkoutComparisonCardProps {
  comparison: WorkoutComparison;
}

/**
 * Plan vs wykonanie: like-for-like rows with Plan, Wykonanie and Różnica
 * columns, and intervals.icu's compliance in the header when it has one.
 */
export default function WorkoutComparisonCard({
  comparison,
}: WorkoutComparisonCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.comparison',
  });

  if (comparison.rows.length === 0) return null;

  const title =
    comparison.compliance === null
      ? t('title')
      : t('titleWithCompliance', {
          compliance: Math.round(comparison.compliance),
        });

  return (
    <WorkoutDetailsCard title={title}>
      <Box flexDirection="row" marginBottom="sm">
        <Box flex={1.3} />
        {[t('planned'), t('actual'), t('difference')].map(header => (
          <Text
            key={header}
            flex={1}
            textAlign="right"
            variant="body-xs-regular"
            color="textSecondary"
          >
            {header}
          </Text>
        ))}
      </Box>
      {comparison.rows.map(row => (
        <Box
          key={row.metric}
          flexDirection="row"
          paddingVertical="sm"
          borderTopWidth={1}
          borderColor="borderDefault"
        >
          <Text flex={1.3} variant="body-s-regular" color="textSecondary">
            {t(`metrics.${row.metric}`)}
          </Text>
          <Text
            flex={1}
            textAlign="right"
            variant="body-s-regular"
            color="textSecondary"
          >
            {formatComparisonValue(row.metric, row.planned)}
          </Text>
          <Text flex={1} textAlign="right" variant="body-s-medium">
            {formatComparisonValue(row.metric, row.actual)}
          </Text>
          <Text
            flex={1}
            textAlign="right"
            variant="body-s-regular"
            color="textSecondary"
          >
            {formatComparisonDifference(row.metric, row.difference)}
          </Text>
        </Box>
      ))}
    </WorkoutDetailsCard>
  );
}
