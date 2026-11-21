import type { ActivityMetricKey } from './activitySummary';
import { formatDuration } from './formatDuration';
import type { ComparisonMetric, WorkoutPlanMetrics } from './workoutDetails';

export type PlanMetricKey =
  | 'duration'
  | 'load'
  | 'intensity'
  | 'work'
  | 'distance';

export type WorkoutMetric =
  | ActivityMetricKey
  | ComparisonMetric
  | PlanMetricKey;

export interface PlanMetric {
  metric: PlanMetricKey;
  value: number;
}

const METRIC_FORMATS: Record<WorkoutMetric, (value: number) => string> = {
  duration: formatDuration,
  movingTime: formatDuration,
  elapsedTime: formatDuration,
  distance: value => `${withPolishDecimalComma(value / 1000, 1)} km`,
  load: value => whole(value),
  intensity: value => `${whole(value)}%`,
  work: value => `${whole(value)} kJ`,
  averagePower: value => `${whole(value)} W`,
  normalizedPower: value => `${whole(value)} W`,
  averageHeartRate: formatHeartRate,
  maxHeartRate: formatHeartRate,
  cadence: value => `${whole(value)} rpm`,
  elevationGain: value => `${whole(value)} m`,
  calories: value => `${whole(value)} kcal`,
  averageSpeed: value => `${withPolishDecimalComma(value * 3.6, 1)} km/h`,
  variabilityIndex: value => withPolishDecimalComma(value, 2),
};

function withPolishDecimalComma(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

function whole(value: number): string {
  return `${Math.round(value)}`;
}

export function formatHeartRate(heartRateBpm: number): string {
  return `${whole(heartRateBpm)} bpm`;
}

export function formatMetric(metric: WorkoutMetric, value: number): string {
  return METRIC_FORMATS[metric](value);
}

export function formatMetricDifference(
  metric: WorkoutMetric,
  actualMinusPlanned: number,
): string {
  const magnitude = formatMetric(metric, Math.abs(actualMinusPlanned));

  if (magnitude === formatMetric(metric, 0)) return `±${magnitude}`;

  return `${actualMinusPlanned > 0 ? '+' : '−'}${magnitude}`;
}

export function planMetricList({
  durationSeconds,
  load,
  intensityPct,
  workKj,
  distanceMeters,
}: WorkoutPlanMetrics): PlanMetric[] {
  const metrics: [PlanMetricKey, number | undefined][] = [
    ['duration', durationSeconds],
    ['load', load],
    ['intensity', intensityPct],
    ['work', workKj],
    ['distance', distanceMeters],
  ];

  return metrics.flatMap(([metric, value]) =>
    value === undefined ? [] : [{ metric, value }],
  );
}
