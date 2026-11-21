import { useTranslation } from 'react-i18next';

import ActivityMetricGrid from '@/components/workout/ActivityMetricGrid';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import type { ActivityMetric } from '@/lib/activitySummary';

export interface WorkoutActivityCardProps {
  metrics: ActivityMetric[];
}

export default function WorkoutActivityCard({
  metrics,
}: WorkoutActivityCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.activity',
  });

  if (metrics.length === 0) return null;

  return (
    <WorkoutDetailsCard title={t('title')}>
      <ActivityMetricGrid metrics={metrics} />
    </WorkoutDetailsCard>
  );
}
