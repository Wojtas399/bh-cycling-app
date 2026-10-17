import {
  formatMetric,
  formatMetricDifference,
  planMetricList,
} from '../formatWorkoutMetric';

describe('formatMetric', () => {
  it('reads times as hours and minutes', () => {
    expect(formatMetric('duration', 4500)).toBe('1h 15m');
    expect(formatMetric('movingTime', 3000)).toBe('50m');
    expect(formatMetric('elapsedTime', 7200)).toBe('2h');
  });

  it('reads distances in km to one decimal with a Polish decimal comma', () => {
    expect(formatMetric('distance', 42_460)).toBe('42,5 km');
  });

  it('reads speed in km/h from m/s', () => {
    expect(formatMetric('averageSpeed', 8.75)).toBe('31,5 km/h');
  });

  it('reads the variability index as a ratio to two decimals', () => {
    expect(formatMetric('variabilityIndex', 1.034)).toBe('1,03');
  });

  it('rounds whole-number metrics and adds their unit', () => {
    expect(formatMetric('load', 81.6)).toBe('82');
    expect(formatMetric('intensity', 86.05)).toBe('86%');
    expect(formatMetric('work', 1149.6)).toBe('1150 kJ');
    expect(formatMetric('averagePower', 211.4)).toBe('211 W');
    expect(formatMetric('normalizedPower', 228.5)).toBe('229 W');
    expect(formatMetric('averageHeartRate', 141.2)).toBe('141 bpm');
    expect(formatMetric('maxHeartRate', 172)).toBe('172 bpm');
    expect(formatMetric('cadence', 88.7)).toBe('89 rpm');
    expect(formatMetric('elevationGain', 412.3)).toBe('412 m');
    expect(formatMetric('calories', 987.6)).toBe('988 kcal');
  });
});

describe('formatMetricDifference', () => {
  it('signs an overshoot with a plus and a shortfall with a true minus', () => {
    expect(formatMetricDifference('load', 4)).toBe('+4');
    expect(formatMetricDifference('work', -52.4)).toBe('−52 kJ');
    expect(formatMetricDifference('duration', -600)).toBe('−10m');
  });

  it('reads a difference that rounds to nothing as ±0', () => {
    expect(formatMetricDifference('intensity', 0.3)).toBe('±0%');
    expect(formatMetricDifference('duration', -20)).toBe('±0m');
  });
});

describe('planMetricList', () => {
  it('lists the planned metrics in display order', () => {
    expect(
      planMetricList({
        distanceMeters: 42_500,
        workKj: 1150,
        intensityPct: 86,
        load: 82,
        durationSeconds: 4500,
      }),
    ).toEqual([
      { metric: 'duration', value: 4500 },
      { metric: 'load', value: 82 },
      { metric: 'intensity', value: 86 },
      { metric: 'work', value: 1150 },
      { metric: 'distance', value: 42_500 },
    ]);
  });

  it('leaves out the metrics the plan does not have', () => {
    expect(planMetricList({ load: 82 })).toEqual([
      { metric: 'load', value: 82 },
    ]);
    expect(planMetricList({})).toEqual([]);
  });
});
