import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import type { ActivityMetric } from '@/lib/workoutDetails';

export interface WorkoutActivityCardProps {
  metrics: ActivityMetric[];
}

/** Wykonanie: the paired Activity's summary metrics in a two-column grid. */
export default function WorkoutActivityCard({
  metrics,
}: WorkoutActivityCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.activity',
  });

  if (metrics.length === 0) return null;

  return (
    <WorkoutDetailsCard title={t('title')}>
      <Box flexDirection="row" flexWrap="wrap" rowGap="base">
        {metrics.map(({ metric, value }) => (
          <Box key={metric} width="50%">
            <Text variant="body-xs-regular" color="textSecondary">
              {t(`metrics.${metric}`)}
            </Text>
            <Text variant="body-xl-regular">{formatMetric(metric, value)}</Text>
          </Box>
        ))}
      </Box>
    </WorkoutDetailsCard>
  );
}
