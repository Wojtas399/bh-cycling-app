import type { IntervalsActivity } from '../intervalsApi';
import {
  isSharedActivity,
  isStravaActivity,
  stravaActivityUrl,
} from '../stravaActivity';

function activity(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'i42',
    name: 'Morning Ride',
    type: 'Ride',
    start_date_local: '2026-11-20T08:00:00',
    moving_time: 3600,
    distance: 30_000,
    ...overrides,
  };
}

describe('isStravaActivity', () => {
  it('is false for an Activity intervals.icu shares, with a name and a type', () => {
    expect(isStravaActivity(activity({}))).toBe(false);
    expect(isSharedActivity(activity({}))).toBe(true);
  });

  it.each([
    ['no type', { type: undefined }],
    ['no name', { name: undefined }],
  ])('marks an Activity with %s as a Strava Activity', (_, overrides) => {
    expect(isStravaActivity(activity(overrides))).toBe(true);
  });

  it('marks an Activity with a null name or type as a Strava Activity', () => {
    const fromStrava = JSON.parse(
      '{"id":"i42","name":null,"type":null,"start_date_local":"2026-11-20T08:00:00","moving_time":0,"distance":0}',
    );

    expect(isStravaActivity(fromStrava)).toBe(true);
  });
});

describe('stravaActivityUrl', () => {
  it('links the Strava page by the intervals.icu id', () => {
    expect(stravaActivityUrl('12345')).toBe(
      'https://www.strava.com/activities/12345',
    );
  });
});
