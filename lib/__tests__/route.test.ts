import type { IntervalsActivity } from '../intervalsApi';
import { activityHasRoute, simplifyRoutePoints, toRoute } from '../route';

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

// At this latitude, 0.00001° of latitude is about 1.1 m.
const LAT = 52.2;

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
    // About 10 m north of the straight line.
    const corner: [number, number] = [LAT + 0.00009, 21.002];

    expect(simplifyRoutePoints([[LAT, 21.0], corner, [LAT, 21.004]])).toEqual([
      [LAT, 21.0],
      corner,
      [LAT, 21.004],
    ]);
  });

  it('drops a corner within about 5 m of the line', () => {
    // About 3 m north of the straight line.
    expect(
      simplifyRoutePoints([
        [LAT, 21.0],
        [LAT + 0.000027, 21.002],
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
    const route = toRoute({
      latlngs: [
        [LAT, 21.0],
        [LAT + 0.001, 21.002],
      ],
      bounds: [[LAT, Number.NaN]] as unknown as [
        [number, number],
        [number, number],
      ],
    });

    expect(route?.bounds).toEqual([
      [LAT, 21.0],
      [LAT + 0.001, 21.002],
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
