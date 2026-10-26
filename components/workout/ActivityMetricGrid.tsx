import { useTranslation } from 'react-i18next';

import MetricGrid from '@/components/workout/MetricGrid';
import type { ActivityMetric } from '@/lib/activitySummary';
import { formatMetric } from '@/lib/formatWorkoutMetric';

export interface ActivityMetricGridProps {
  metrics: ActivityMetric[];
}

/**
 * An Activity's summary metrics in a two-column grid, labelled and formatted
 * the same on Workout Details and Activity Details.
 */
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
        value: formatMetric(metric, value),
      }))}
    />
  );
}
