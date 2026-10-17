import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import WorkoutDetailsCard from '@/components/workout/WorkoutDetailsCard';
import { formatDuration } from '@/lib/formatDuration';
import type { WorkoutPlanMetrics } from '@/lib/workoutDetails';

export interface WorkoutPlanCardProps {
  metrics: WorkoutPlanMetrics;
}

interface PlanMetric {
  key: 'duration' | 'load' | 'intensity' | 'work' | 'distance';
  value: string;
}

/**
 * The Plan card of a planned or missed Workout: a two-column grid of the
 * planned metrics intervals.icu supplies. Hidden when it supplies none.
 */
export default function WorkoutPlanCard({ metrics }: WorkoutPlanCardProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.plan',
  });
  const rows = planRows(metrics);

  if (rows.length === 0) return null;

  return (
    <WorkoutDetailsCard title={t('title')}>
      <Box flexDirection="row" flexWrap="wrap" rowGap="base">
        {rows.map(row => (
          <Box key={row.key} width="50%">
            <Text variant="body-xs-regular" color="textSecondary">
              {t(row.key)}
            </Text>
            <Text variant="body-xl-regular">{row.value}</Text>
          </Box>
        ))}
      </Box>
    </WorkoutDetailsCard>
  );
}

function planRows({
  durationSeconds,
  load,
  intensityPct,
  workKj,
  distanceMeters,
}: WorkoutPlanMetrics): PlanMetric[] {
  const rows: (PlanMetric | null)[] = [
    durationSeconds !== undefined
      ? { key: 'duration', value: formatDuration(durationSeconds) }
      : null,
    load !== undefined ? { key: 'load', value: `${Math.round(load)}` } : null,
    intensityPct !== undefined
      ? { key: 'intensity', value: `${Math.round(intensityPct)}%` }
      : null,
    workKj !== undefined
      ? { key: 'work', value: `${Math.round(workKj)} kJ` }
      : null,
    distanceMeters !== undefined
      ? { key: 'distance', value: formatKilometres(distanceMeters) }
      : null,
  ];

  return rows.filter(row => row !== null);
}

/** Metres as kilometres to one decimal place, with a Polish decimal comma. */
function formatKilometres(metres: number): string {
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}
