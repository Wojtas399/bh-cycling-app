import {
  type ActivityDetails,
  pairedEventIdOf,
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
} = {}): ActivityDetails {
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
