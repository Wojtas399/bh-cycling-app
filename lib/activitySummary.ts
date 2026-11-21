import type { IntervalsActivity } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

export type ActivityMetricKey =
  | 'movingTime'
  | 'distance'
  | 'load'
  | 'intensity'
  | 'averagePower'
  | 'normalizedPower'
  | 'averageHeartRate'
  | 'maxHeartRate'
  | 'cadence'
  | 'elevationGain'
  | 'calories'
  | 'averageSpeed'
  | 'elapsedTime'
  | 'variabilityIndex';

export interface ActivityMetric {
  metric: ActivityMetricKey;
  value: number;
}

const ACTIVITY_METRIC_FIELDS = [
  ['movingTime', 'moving_time'],
  ['distance', 'distance'],
  ['load', 'icu_training_load'],
  ['intensity', 'icu_intensity'],
  ['averagePower', 'icu_average_watts'],
  ['normalizedPower', 'icu_weighted_avg_watts'],
  ['averageHeartRate', 'average_heartrate'],
  ['maxHeartRate', 'max_heartrate'],
  ['cadence', 'average_cadence'],
  ['elevationGain', 'total_elevation_gain'],
  ['calories', 'calories'],
  ['averageSpeed', 'average_speed'],
  ['elapsedTime', 'elapsed_time'],
  ['variabilityIndex', 'icu_variability_index'],
] as const satisfies readonly (readonly [
  ActivityMetricKey,
  keyof IntervalsActivity,
])[];

export type ActivityMetricField = (typeof ACTIVITY_METRIC_FIELDS)[number][1];

export const ACTIVITY_METRIC_FIELD_NAMES: readonly ActivityMetricField[] =
  ACTIVITY_METRIC_FIELDS.map(([, field]) => field);

export function summariseActivity(
  activity: Pick<IntervalsActivity, ActivityMetricField>,
): ActivityMetric[] {
  return ACTIVITY_METRIC_FIELDS.flatMap(([metric, field]) => {
    const value = activity[field];

    return isFiniteNumber(value) ? [{ metric, value }] : [];
  });
}
