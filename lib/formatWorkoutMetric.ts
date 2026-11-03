import type { ActivityMetricKey } from './activitySummary';
import { formatDuration } from './formatDuration';
import type { ComparisonMetric, WorkoutPlanMetrics } from './workoutDetails';

/** A metric of the Plan card. */
export type PlanMetricKey =
  | 'duration'
  | 'load'
  | 'intensity'
  | 'work'
  | 'distance';

/** Any metric Workout Details shows: plan, comparison or Activity. */
export type WorkoutMetric =
  | ActivityMetricKey
  | ComparisonMetric
  | PlanMetricKey;

/** A planned metric with its value in the view model's units. */
export interface PlanMetric {
  metric: PlanMetricKey;
  value: number;
}

/**
 * How each metric reads, from the view model's unit: times in s, distance in
 * m, speed in m/s, work in kJ, intensity in % (IF × 100). One mapping for
 * every card, so a metric reads the same wherever it appears.
 */
const METRIC_FORMATS: Record<WorkoutMetric, (value: number) => string> = {
  duration: formatDuration,
  movingTime: formatDuration,
  elapsedTime: formatDuration,
  distance: value => `${decimal(value / 1000, 1)} km`,
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
  averageSpeed: value => `${decimal(value * 3.6, 1)} km/h`,
  variabilityIndex: value => decimal(value, 2),
};

/** A number with a Polish decimal comma. */
function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

function whole(value: number): string {
  return `${Math.round(value)}`;
}

/** A heart rate in bpm, as a whole number with its unit. */
export function formatHeartRate(value: number): string {
  return `${whole(value)} bpm`;
}

/** Formats a metric's value with its unit. */
export function formatMetric(metric: WorkoutMetric, value: number): string {
  return METRIC_FORMATS[metric](value);
}

/**
 * Formats a signed difference (`actual − planned`) in the metric's unit, with
 * a true minus sign; one that rounds to nothing reads as `±0`.
 */
export function formatMetricDifference(
  metric: WorkoutMetric,
  difference: number,
): string {
  const magnitude = formatMetric(metric, Math.abs(difference));

  if (magnitude === formatMetric(metric, 0)) return `±${magnitude}`;

  return `${difference > 0 ? '+' : '−'}${magnitude}`;
}

/** The planned metrics the plan has, in the Plan card's display order. */
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
