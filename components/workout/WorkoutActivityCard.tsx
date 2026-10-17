import { useTranslation } from 'react-i18next';

import MetricGrid from '@/components/workout/MetricGrid';
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
      <MetricGrid
        items={metrics.map(({ metric, value }) => ({
          key: metric,
          label: t(`metrics.${metric}`),
          value: formatMetric(metric, value),
        }))}
      />
    </WorkoutDetailsCard>
  );
}
