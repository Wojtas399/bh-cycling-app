import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import { formatMetric, planMetricList } from '@/lib/formatWorkoutMetric';
import type { WorkoutPlanMetrics } from '@/lib/workoutDetails';

export interface WorkoutPlanCardProps {
  metrics: WorkoutPlanMetrics;
}

/**
 * The Plan card of a planned or missed Workout: a two-column grid of the
 * planned metrics intervals.icu supplies. Hidden when it supplies none.
 */
export default function WorkoutPlanCard({ metrics }: WorkoutPlanCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.plan',
  });
  const rows = planMetricList(metrics);

  if (rows.length === 0) return null;

  return (
    <WorkoutDetailsCard title={t('title')}>
      <Box flexDirection="row" flexWrap="wrap" rowGap="base">
        {rows.map(({ metric, value }) => (
          <Box key={metric} width="50%">
            <Text variant="body-xs-regular" color="textSecondary">
              {t(metric)}
            </Text>
            <Text variant="body-xl-regular">{formatMetric(metric, value)}</Text>
          </Box>
        ))}
      </Box>
    </WorkoutDetailsCard>
  );
}
