import {
  ACTIVITY_METRIC_FIELD_NAMES,
  summariseActivity,
} from '../activitySummary';

describe('summariseActivity', () => {
  it('lists the metrics the Activity has, in display order', () => {
    expect(
      summariseActivity({
        icu_variability_index: 1.04,
        icu_average_watts: 182,
        distance: 30_500,
        moving_time: 3600,
      }),
    ).toEqual([
      { metric: 'movingTime', value: 3600 },
      { metric: 'distance', value: 30_500 },
      { metric: 'averagePower', value: 182 },
      { metric: 'variabilityIndex', value: 1.04 },
    ]);
  });

  it('drops a metric the Activity lacks but keeps a 0', () => {
    expect(
      summariseActivity({
        moving_time: 0,
        distance: 0,
        icu_average_watts: undefined,
      }),
    ).toEqual([
      { metric: 'movingTime', value: 0 },
      { metric: 'distance', value: 0 },
    ]);
  });
});

describe('ACTIVITY_METRIC_FIELD_NAMES', () => {
  it('names the field of every summary metric, in display order', () => {
    expect(ACTIVITY_METRIC_FIELD_NAMES).toEqual([
      'moving_time',
      'distance',
      'icu_training_load',
      'icu_intensity',
      'icu_average_watts',
      'icu_weighted_avg_watts',
      'average_heartrate',
      'max_heartrate',
      'average_cadence',
      'total_elevation_gain',
      'calories',
      'average_speed',
      'elapsed_time',
      'icu_variability_index',
    ]);
  });
});
