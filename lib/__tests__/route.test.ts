import type { IntervalsActivity, IntervalsActivityMap } from '../intervalsApi';
import {
  activityHasRoute,
  simplifyRoutePoints,
  summariseRoute,
  toRoute,
} from '../route';
import { readIntervalsBody } from '@/test-utils/intervalsJson';

function activity(
  overrides: Partial<IntervalsActivity> = {},
): IntervalsActivity {
  return {
    id: 'i1',
    name: 'Morning ride',
    type: 'Ride',
    start_date_local: '2026-10-17T09:00:00',
    moving_time: 3600,
    distance: 30_000,
    stream_types: ['time', 'watts', 'latlng', 'heartrate'],
    ...overrides,
  };
}

describe('activityHasRoute', () => {
  it('is true for an outdoor ride with a latlng stream', () => {
    expect(activityHasRoute(activity())).toBe(true);
  });

  it('is false without a latlng stream', () => {
    expect(
      activityHasRoute(activity({ stream_types: ['time', 'watts'] })),
    ).toBe(false);
  });

  it('is false when the stream types are missing', () => {
    expect(activityHasRoute(activity({ stream_types: undefined }))).toBe(false);
  });

  it('is false for a trainer ride, even with a latlng stream', () => {
    expect(activityHasRoute(activity({ trainer: true }))).toBe(false);
  });

  it('is true when trainer is false', () => {
    expect(activityHasRoute(activity({ trainer: false }))).toBe(true);
  });

  it('is false for a VirtualRide, whose latlng is in game-world coordinates', () => {
    expect(activityHasRoute(activity({ type: 'VirtualRide' }))).toBe(false);
  });
});

const LAT = 52.2;
const ABOUT_10_M_OF_LATITUDE = 0.00009;
const ABOUT_3_M_OF_LATITUDE = 0.000027;

describe('simplifyRoutePoints', () => {
  it('collapses a straight line to its endpoints', () => {
    expect(
      simplifyRoutePoints([
        [LAT, 21.0],
        [LAT, 21.001],
        [LAT, 21.002],
        [LAT, 21.003],
        [LAT, 21.004],
      ]),
    ).toEqual([
      [LAT, 21.0],
      [LAT, 21.004],
    ]);
  });

  it('keeps a corner further than about 5 m off the line', () => {
    const corner: [number, number] = [LAT + ABOUT_10_M_OF_LATITUDE, 21.002];

    expect(simplifyRoutePoints([[LAT, 21.0], corner, [LAT, 21.004]])).toEqual([
      [LAT, 21.0],
      corner,
      [LAT, 21.004],
    ]);
  });

  it('drops a corner within about 5 m of the line', () => {
    expect(
      simplifyRoutePoints([
        [LAT, 21.0],
        [LAT + ABOUT_3_M_OF_LATITUDE, 21.002],
        [LAT, 21.004],
      ]),
    ).toEqual([
      [LAT, 21.0],
      [LAT, 21.004],
    ]);
  });

  it('always keeps the endpoints, even when they almost coincide', () => {
    const points: [number, number][] = [
      [LAT, 21.0],
      [LAT + 0.0001, 21.0001],
      [LAT + 0.00002, 21.0002],
      [LAT, 21.000001],
    ];
    const simplified = simplifyRoutePoints(points);

    expect(simplified[0]).toEqual([LAT, 21.0]);
    expect(simplified.at(-1)).toEqual([LAT, 21.000001]);
  });

  it('keeps a loop that returns to its start', () => {
    const loop: [number, number][] = [
      [LAT, 21.0],
      [LAT + 0.001, 21.0],
      [LAT + 0.001, 21.001],
      [LAT, 21.001],
      [LAT, 21.0],
    ];

    expect(simplifyRoutePoints(loop)).toEqual(loop);
  });

  it('leaves two points alone', () => {
    expect(
      simplifyRoutePoints([
        [LAT, 21.0],
        [LAT, 21.001],
      ]),
    ).toEqual([
      [LAT, 21.0],
      [LAT, 21.001],
    ]);
  });
});

describe('toRoute', () => {
  it('keeps the [lat, lng] order of the points and the response bounds', () => {
    const route = toRoute({
      latlngs: [
        [LAT, 21.0],
        [LAT + 0.001, 21.002],
      ],
      bounds: [
        [LAT, 21.0],
        [LAT + 0.001, 21.002],
      ],
    });

    expect(route).toEqual({
      points: [
        [LAT, 21.0],
        [LAT + 0.001, 21.002],
      ],
      bounds: [
        [LAT, 21.0],
        [LAT + 0.001, 21.002],
      ],
    });
  });

  it('drops null pairs and pairs with a non-finite coordinate', () => {
    const route = toRoute({
      latlngs: [
        [LAT, 21.0],
        null,
        [Number.NaN, 21.001],
        [LAT, Number.POSITIVE_INFINITY],
        [LAT + 0.001, 21.002],
      ],
    });

    expect(route?.points).toEqual([
      [LAT, 21.0],
      [LAT + 0.001, 21.002],
    ]);
  });

  it('simplifies the points, keeping the endpoints', () => {
    const route = toRoute({
      latlngs: [
        [LAT, 21.0],
        [LAT, 21.001],
        [LAT, 21.002],
      ],
    });

    expect(route?.points).toEqual([
      [LAT, 21.0],
      [LAT, 21.002],
    ]);
  });

  it('computes the bounds from the points when the response has none', () => {
    const route = toRoute({
      latlngs: [
        [LAT + 0.002, 21.001],
        [LAT, 21.005],
        [LAT + 0.004, 21.0],
      ],
      bounds: null,
    });

    expect(route?.bounds).toEqual([
      [LAT, 21.0],
      [LAT + 0.004, 21.005],
    ]);
  });

  it('computes the bounds when the response bounds are malformed', () => {
    const route = toRoute(
      readIntervalsBody<IntervalsActivityMap>({
        latlngs: [
          [LAT, 21.0],
          [LAT + 0.001, 21.002],
        ],
        bounds: [[LAT, null]],
      }),
    );

    expect(route?.bounds).toEqual([
      [LAT, 21.0],
      [LAT + 0.001, 21.002],
    ]);
  });

  it('computes the bounds from every valid point, even one simplification drops', () => {
    const route = toRoute({
      latlngs: [
        [LAT, 21.0],
        [LAT + ABOUT_3_M_OF_LATITUDE, 21.002],
        [LAT, 21.004],
      ],
      bounds: null,
    });

    expect(route?.points).toHaveLength(2);
    expect(route?.bounds).toEqual([
      [LAT, 21.0],
      [LAT + ABOUT_3_M_OF_LATITUDE, 21.004],
    ]);
  });

  it('is null when fewer than 2 valid points remain', () => {
    expect(toRoute({ latlngs: [[LAT, 21.0], null] })).toBeNull();
  });

  it('is null when the track is empty or missing', () => {
    expect(toRoute({ latlngs: [] })).toBeNull();
    expect(toRoute({ latlngs: null })).toBeNull();
    expect(toRoute({})).toBeNull();
  });
});

describe('summariseRoute', () => {
  it('names the Activity, its distance in metres and its local start', () => {
    expect(summariseRoute(activity({ elapsed_time: undefined }))).toEqual({
      activityId: 'i1',
      distanceMeters: 30_000,
      startLocal: '2026-10-17T09:00:00',
    });
  });

  it('finishes at the start plus the elapsed time, stops included', () => {
    expect(
      summariseRoute(activity({ moving_time: 3600, elapsed_time: 4500 }))
        ?.finishLocal,
    ).toBe('2026-10-17T10:15:00');
  });

  it("leaves out a distance or a finish that isn't a finite number", () => {
    const summary = summariseRoute(
      activity({ distance: Number.NaN, elapsed_time: Number.NaN }),
    );

    expect(summary).not.toHaveProperty('distanceMeters');
    expect(summary).not.toHaveProperty('finishLocal');
  });

  it('is null for an Activity with no Route', () => {
    expect(summariseRoute(activity({ type: 'VirtualRide' }))).toBeNull();
  });
});
