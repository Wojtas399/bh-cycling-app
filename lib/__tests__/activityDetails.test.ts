import {
  type ActivityDetails,
  pairedEventIdOf,
  profileStreamIdOf,
  routeOf,
} from '../activityDetails';
import type { RouteSummary } from '../route';

const ROUTE: RouteSummary = {
  activityId: 'i196064284',
  distanceMeters: 48_200,
  startLocal: '2026-10-23T16:42:00',
  finishLocal: '2026-10-23T18:25:00',
};

function shown({
  route = null,
  pairedEventId = null,
}: {
  route?: RouteSummary | null;
  pairedEventId?: number | null;
} = {}): Extract<ActivityDetails, { isStravaActivity: false }> {
  return {
    isStravaActivity: false,
    title: null,
    type: 'Ride',
    startLocal: '2026-10-23T16:42:00',
    blocks: [],
    profileSummary: null,
    icuFtp: null,
    zoneTimes: null,
    metrics: [],
    route,
    pairedEventId,
  };
}

describe('routeOf', () => {
  it("is the Activity's Route summary", () => {
    expect(routeOf(shown({ route: ROUTE }))).toBe(ROUTE);
  });

  it('is null for an Activity without a Route', () => {
    expect(routeOf(shown({ route: null }))).toBeNull();
  });

  it('is null for a Strava Activity', () => {
    expect(routeOf({ isStravaActivity: true })).toBeNull();
  });

  it('is undefined while the details are still loading', () => {
    expect(routeOf(undefined)).toBeUndefined();
  });
});

describe('pairedEventIdOf', () => {
  it('is the event the Activity is paired to', () => {
    expect(pairedEventIdOf(shown({ pairedEventId: 4242 }))).toBe(4242);
  });

  it('is null for an Activity that is not paired', () => {
    expect(pairedEventIdOf(shown({ pairedEventId: null }))).toBeNull();
  });

  it('is null for a Strava Activity', () => {
    expect(pairedEventIdOf({ isStravaActivity: true })).toBeNull();
  });

  it('is null while the details are still loading', () => {
    expect(pairedEventIdOf(undefined)).toBeNull();
  });
});

describe('profileStreamIdOf', () => {
  const ACTIVITY_ID = 'i196064284';
  const drawn: ActivityDetails = {
    ...shown(),
    blocks: [{ widthFraction: 1, minPct: 80, maxPct: 80, zone: 3 }],
    profileSummary: {
      startSeconds: 0,
      durationSeconds: 600,
      segmentCount: 1,
      peakFtpPct: 80,
    },
  };

  it('is the Activity when it has an Activity Profile to draw', () => {
    expect(profileStreamIdOf(ACTIVITY_ID, drawn)).toBe(ACTIVITY_ID);
  });

  it.each<[string, ActivityDetails | undefined]>([
    ['no Activity Profile', shown()],
    ['a Strava Activity', { isStravaActivity: true }],
    ['details still loading', undefined],
  ])('is null for %s', (_, details) => {
    expect(profileStreamIdOf(ACTIVITY_ID, details)).toBeNull();
  });
});
