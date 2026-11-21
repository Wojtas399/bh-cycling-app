import {
  type ActivityDetails,
  buildActivityDetails,
  pairedEventIdOf,
  routeOf,
  toStoredActivityDetails,
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

describe('toStoredActivityDetails', () => {
  it('stores a body with no type, which is how intervals.icu sends a Strava Activity, as a Strava Activity marker', () => {
    expect(
      toStoredActivityDetails({
        id: 'i42',
        start_date_local: '2026-10-23T16:42:00',
        moving_time: 0,
        distance: 0,
        _note: 'STRAVA activities are not available via the API',
      }),
    ).toEqual({ isStravaActivity: true });
  });
});

describe('buildActivityDetails', () => {
  it('leaves out of the Activity Profile an interval with missing times or one that ends before it starts', () => {
    const details = buildActivityDetails({
      isStravaActivity: false,
      activity: {
        id: 'i42',
        type: 'Ride',
        start_date_local: '2026-10-23T16:42:00',
        moving_time: 600,
        distance: 0,
        icu_intervals: [
          { start_time: 0, end_time: 600, intensity: 80, zone: 3 },
          { end_time: 1200, intensity: 90, zone: 4 },
          { start_time: 900, end_time: 900, intensity: 90, zone: 4 },
          { start_time: 2000, end_time: 1500, intensity: 90, zone: 4 },
        ],
      },
    });

    expect(details).toMatchObject({
      blocks: [{ widthFraction: 1, minPct: 80, maxPct: 80, zone: 3 }],
      profileSummary: {
        durationSeconds: 600,
        segmentCount: 1,
        peakFtpPct: 80,
      },
    });
  });

  it('draws an interval with no intensity or no zone as a gap in the Activity Profile', () => {
    const details = buildActivityDetails({
      isStravaActivity: false,
      activity: {
        id: 'i42',
        type: 'Ride',
        start_date_local: '2026-10-23T16:42:00',
        moving_time: 1800,
        distance: 0,
        icu_intervals: [
          { start_time: 0, end_time: 600, intensity: 80, zone: 3 },
          { start_time: 600, end_time: 1200, intensity: null, zone: 4 },
          { start_time: 1200, end_time: 1800, intensity: 90, zone: null },
        ],
      },
    });

    expect(details).toMatchObject({
      blocks: [
        { widthFraction: 1 / 3, minPct: 80, maxPct: 80, zone: 3 },
        { widthFraction: 2 / 3, minPct: 0, maxPct: 0, zone: 1 },
      ],
      profileSummary: {
        durationSeconds: 1800,
        segmentCount: 1,
        peakFtpPct: 80,
      },
    });
  });
});
