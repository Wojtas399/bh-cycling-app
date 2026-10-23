import type { IntervalsActivity } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

/**
 * A summary metric of an Activity, shown in Workout Details' Wykonanie card
 * and Activity Details' Podsumowanie card. Units as intervals.icu sends them:
 * times in s, distance and elevation in m, intensity in % (IF × 100), power
 * in W, heart rate in bpm, cadence in rpm, calories in kcal, speed in m/s and
 * the variability index as a ratio.
 */
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

/** Where each Activity metric comes from, in display order. */
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

/** An Activity field a summary metric is read from. */
export type ActivityMetricField = (typeof ACTIVITY_METRIC_FIELDS)[number][1];

/** Every Activity field a summary metric is read from, in display order. */
export const ACTIVITY_METRIC_FIELD_NAMES: readonly ActivityMetricField[] =
  ACTIVITY_METRIC_FIELDS.map(([, field]) => field);

/** The Activity's summary metrics it actually has; absent ones are dropped. */
export function summariseActivity(
  activity: Pick<IntervalsActivity, ActivityMetricField>,
): ActivityMetric[] {
  return ACTIVITY_METRIC_FIELDS.flatMap(([metric, field]) => {
    const value = activity[field];

    return isFiniteNumber(value) ? [{ metric, value }] : [];
  });
}
