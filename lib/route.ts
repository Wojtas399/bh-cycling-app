import type { IntervalsActivity, IntervalsActivityMap } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import {
  type LocalDateTimeString,
  addSecondsToLocalDateTime,
} from './localDateTime';

export interface Route {
  points: [lat: number, lng: number][];
  bounds: [[minLat: number, minLng: number], [maxLat: number, maxLng: number]];
}

export interface RouteSummary {
  activityId: string;
  distanceMeters?: number;
  startLocal: LocalDateTimeString;
  finishLocal?: LocalDateTimeString;
}

export function activityHasRoute(
  activity: Pick<IntervalsActivity, 'stream_types' | 'trainer' | 'type'>,
): boolean {
  return (
    (activity.stream_types?.includes('latlng') ?? false) &&
    activity.trainer !== true &&
    activity.type !== 'VirtualRide'
  );
}

export function summariseRoute(
  activity: Pick<
    IntervalsActivity,
    | 'id'
    | 'distance'
    | 'start_date_local'
    | 'elapsed_time'
    | 'stream_types'
    | 'trainer'
    | 'type'
  >,
): RouteSummary | null {
  if (!activityHasRoute(activity)) return null;

  const { id, distance, start_date_local, elapsed_time } = activity;

  return {
    activityId: id,
    ...(isFiniteNumber(distance) && { distanceMeters: distance }),
    startLocal: start_date_local,
    ...(isFiniteNumber(elapsed_time) && {
      finishLocal: addSecondsToLocalDateTime(start_date_local, elapsed_time),
    }),
  };
}

export function toRoute(map: IntervalsActivityMap): Route | null {
  const valid = (map.latlngs ?? []).filter(
    (pair): pair is [number, number] =>
      Array.isArray(pair) &&
      Number.isFinite(pair[0]) &&
      Number.isFinite(pair[1]),
  );

  if (valid.length < 2) return null;

  return {
    points: simplifyRoutePoints(valid),
    bounds: isWellFormedBounds(map.bounds)
      ? map.bounds
      : boundsOfEveryValidPoint(valid),
  };
}

function isWellFormedBounds(
  bounds: IntervalsActivityMap['bounds'],
): bounds is Route['bounds'] {
  return (
    Array.isArray(bounds) &&
    bounds.length === 2 &&
    bounds.every(
      corner =>
        Array.isArray(corner) &&
        corner.length === 2 &&
        corner.every(Number.isFinite),
    )
  );
}

function boundsOfEveryValidPoint(points: Route['points']): Route['bounds'] {
  let [minLat, minLng] = points[0];
  let [maxLat, maxLng] = points[0];

  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

const SIMPLIFY_TOLERANCE_METERS = 5;

const EARTH_RADIUS_METERS = 6_371_008.8;

export function simplifyRoutePoints(
  points: Route['points'],
  toleranceMeters = SIMPLIFY_TOLERANCE_METERS,
): Route['points'] {
  return ramerDouglasPeuckerKeepingEndpoints(points, toleranceMeters);
}

function ramerDouglasPeuckerKeepingEndpoints(
  points: Route['points'],
  toleranceMeters: number,
): Route['points'] {
  if (points.length <= 2) return points.slice();

  const xy = flatMetersAroundFirstPoint(points);
  const keep = new Uint8Array(points.length);

  keep[0] = 1;
  keep[points.length - 1] = 1;

  const rangesToSplitWithoutRecursion: [number, number][] = [
    [0, points.length - 1],
  ];

  for (
    let range = rangesToSplitWithoutRecursion.pop();
    range;
    range = rangesToSplitWithoutRecursion.pop()
  ) {
    const [first, last] = range;
    let farthest: number | null = null;
    let farthestDistance = toleranceMeters;

    for (let i = first + 1; i < last; i++) {
      const distance = projectedMetersToSegment(xy[i], xy[first], xy[last]);

      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }

    if (farthest !== null) {
      keep[farthest] = 1;
      rangesToSplitWithoutRecursion.push([first, farthest], [farthest, last]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}

function flatMetersAroundFirstPoint(points: Route['points']): number[][] {
  const metersPerDegLat = (EARTH_RADIUS_METERS * Math.PI) / 180;
  const metersPerDegLng =
    metersPerDegLat * Math.cos((points[0][0] * Math.PI) / 180);

  return points.map(([lat, lng]) => [
    lng * metersPerDegLng,
    lat * metersPerDegLat,
  ]);
}

function projectedMetersToSegment(
  p: number[],
  a: number[],
  b: number[],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared,
          ),
        );

  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
