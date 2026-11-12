import type { IntervalsActivity, IntervalsActivityMap } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import {
  type LocalDateTimeString,
  addSecondsToLocalDateTime,
} from './localDateTime';

/**
 * The GPS track of an Activity: where the athlete actually rode.
 * Points and bounds are `[lat, lng]`, as intervals.icu sends them.
 */
export interface Route {
  points: [lat: number, lng: number][];
  /** `[[minLat, minLng], [maxLat, maxLng]]`. */
  bounds: [[minLat: number, minLng: number], [maxLat: number, maxLng: number]];
}

/**
 * An Activity's Route, as a details screen knows it before fetching: what the
 * Route banner and the full-screen map need besides the Route itself.
 */
export interface RouteSummary {
  /** The Activity's id, which keys the Route query. */
  activityId: string;
  /**
   * The Activity's `distance` in m, the same value as its summary metrics.
   * Absent when not finite.
   */
  distanceMeters?: number;
  /** The Activity's `start_date_local`, a local date-time with no zone. */
  startLocal: LocalDateTimeString;
  /**
   * Start + `elapsed_time` (stops included), the same local format. Absent
   * when `elapsed_time` isn't a finite number.
   */
  finishLocal?: LocalDateTimeString;
}

/**
 * True only for an Activity ridden outdoors with GPS. A trainer ride or a
 * VirtualRide can carry a `latlng` stream too (a VirtualRide's is a full track
 * in game-world coordinates), so both are ruled out explicitly.
 */
export function activityHasRoute(
  activity: Pick<IntervalsActivity, 'stream_types' | 'trainer' | 'type'>,
): boolean {
  return (
    (activity.stream_types?.includes('latlng') ?? false) &&
    activity.trainer !== true &&
    activity.type !== 'VirtualRide'
  );
}

/**
 * What a details screen's Route banner needs of an Activity, `null` when it
 * has no Route (see `activityHasRoute`).
 */
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

/**
 * Turns an Activity's map into a drawable Route: drops unusable pairs,
 * simplifies the track (see `simplifyRoutePoints`) and takes the response's
 * bounds when well-formed, computing them otherwise. `null` when fewer than 2
 * valid points remain, so there's no line to draw.
 */
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
    bounds: isWellFormedBounds(map.bounds) ? map.bounds : boundsOf(valid),
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

/** Computed from every valid point, so simplification can't trim them. */
function boundsOf(points: Route['points']): Route['bounds'] {
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

/** How far, in m, a point may sit off the simplified line and be dropped. */
const SIMPLIFY_TOLERANCE_METERS = 5;

const EARTH_RADIUS_METERS = 6_371_008.8;

/**
 * Simplifies a track with Ramer–Douglas–Peucker: drops every point within
 * `toleranceMeters` of the line kept around it. The endpoints are always kept.
 * Distances use a flat projection around the first point, close enough over
 * the span of one ride.
 */
export function simplifyRoutePoints(
  points: Route['points'],
  toleranceMeters = SIMPLIFY_TOLERANCE_METERS,
): Route['points'] {
  if (points.length <= 2) return points.slice();

  const metersPerDegLat = (EARTH_RADIUS_METERS * Math.PI) / 180;
  const metersPerDegLng =
    metersPerDegLat * Math.cos((points[0][0] * Math.PI) / 180);
  const xy = points.map(([lat, lng]) => [
    lng * metersPerDegLng,
    lat * metersPerDegLat,
  ]);

  const keep = new Uint8Array(points.length);

  keep[0] = 1;
  keep[points.length - 1] = 1;

  // An explicit stack, so a long ride can't overflow the call stack.
  const stack: [number, number][] = [[0, points.length - 1]];

  for (let range = stack.pop(); range; range = stack.pop()) {
    const [first, last] = range;
    let farthest = -1;
    let farthestDistance = toleranceMeters;

    for (let i = first + 1; i < last; i++) {
      const distance = distanceToSegment(xy[i], xy[first], xy[last]);

      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }

    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}

/** Distance from `p` to the segment `a`–`b`, all in projected metres. */
function distanceToSegment(p: number[], a: number[], b: number[]): number {
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
