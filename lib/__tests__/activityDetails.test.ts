import { type ActivityDetails, routeOf } from '../activityDetails';
import type { RouteSummary } from '../route';

const ROUTE: RouteSummary = {
  activityId: 'i196064284',
  distanceMeters: 48_200,
  startLocal: '2026-10-23T16:42:00',
  finishLocal: '2026-10-23T18:25:00',
};

function shown(route: RouteSummary | null): ActivityDetails {
  return {
    isStravaActivity: false,
    title: null,
    type: 'Ride',
    startLocal: '2026-10-23T16:42:00',
    blocks: [],
    profileSummary: null,
    metrics: [],
    route,
  };
}

describe('routeOf', () => {
  it("is the Activity's Route summary", () => {
    expect(routeOf(shown(ROUTE))).toBe(ROUTE);
  });

  it('is null for an Activity without a Route', () => {
    expect(routeOf(shown(null))).toBeNull();
  });

  it('is null for a Strava Activity', () => {
    expect(routeOf({ isStravaActivity: true })).toBeNull();
  });

  it('is undefined while the details are still loading', () => {
    expect(routeOf(undefined)).toBeUndefined();
  });
});
