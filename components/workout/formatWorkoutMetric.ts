import { formatDuration } from '@/lib/formatDuration';
import type { ActivityMetricKey, ComparisonMetric } from '@/lib/workoutDetails';

/** A number with a Polish decimal comma. */
function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

const round = (value: number) => `${Math.round(value)}`;

/** Formats a Plan vs wykonanie value in its row's unit. */
export function formatComparisonValue(
  metric: ComparisonMetric,
  value: number,
): string {
  switch (metric) {
    case 'duration':
      return formatDuration(value);
    case 'load':
      return round(value);
    case 'intensity':
      return `${round(value)}%`;
    case 'work':
      return `${round(value)} kJ`;
  }
}

/** Formats a signed difference (`actual − planned`) in the row's unit. */
export function formatComparisonDifference(
  metric: ComparisonMetric,
  difference: number,
): string {
  const magnitude = formatComparisonValue(metric, Math.abs(difference));

  if (magnitude === formatComparisonValue(metric, 0)) return `±${magnitude}`;

  return `${difference > 0 ? '+' : '−'}${magnitude}`;
}

/** Formats one of the Activity's summary metrics with its unit. */
export function formatActivityMetric(
  metric: ActivityMetricKey,
  value: number,
): string {
  switch (metric) {
    case 'movingTime':
    case 'elapsedTime':
      return formatDuration(value);
    case 'distance':
      return `${decimal(value / 1000, 1)} km`;
    case 'load':
      return round(value);
    case 'intensity':
      return `${round(value)}%`;
    case 'averagePower':
    case 'normalizedPower':
      return `${round(value)} W`;
    case 'averageHeartRate':
    case 'maxHeartRate':
      return `${round(value)} bpm`;
    case 'cadence':
      return `${round(value)} rpm`;
    case 'elevationGain':
      return `${round(value)} m`;
    case 'calories':
      return `${round(value)} kcal`;
    case 'averageSpeed':
      return `${decimal(value * 3.6, 1)} km/h`;
    case 'variabilityIndex':
      return decimal(value, 2);
  }
}
