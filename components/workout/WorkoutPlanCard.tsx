import { useTranslation } from 'react-i18next';

import MetricGrid from '@/components/workout/MetricGrid';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import { formatMetric, planMetricList } from '@/lib/formatWorkoutMetric';
import type { WorkoutPlanMetrics } from '@/lib/workoutDetails';

export interface WorkoutPlanCardProps {
  metrics: WorkoutPlanMetrics;
}

export default function WorkoutPlanCard({ metrics }: WorkoutPlanCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.plan',
  });
  const rows = planMetricList(metrics);

  if (rows.length === 0) return null;

  return (
    <WorkoutDetailsCard title={t('title')}>
      <MetricGrid
        items={rows.map(({ metric, value }) => ({
          key: metric,
          label: t(metric),
          formattedValue: formatMetric(metric, value),
        }))}
      />
    </WorkoutDetailsCard>
  );
}
