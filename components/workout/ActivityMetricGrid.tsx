import { useTranslation } from 'react-i18next';

import MetricGrid from '@/components/workout/MetricGrid';
import type { ActivityMetric } from '@/lib/activitySummary';
import { formatMetric } from '@/lib/formatWorkoutMetric';

export interface ActivityMetricGridProps {
  metrics: ActivityMetric[];
}

export default function ActivityMetricGrid({
  metrics,
}: ActivityMetricGridProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.activity.metrics',
  });

  return (
    <MetricGrid
      items={metrics.map(({ metric, value }) => ({
        key: metric,
        label: t(metric),
        formattedValue: formatMetric(metric, value),
      }))}
    />
  );
}
