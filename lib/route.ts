/**
 * The GPS track of an Activity: where the athlete actually rode.
 * Points and bounds are `[lat, lng]`, as intervals.icu sends them.
 */
export interface Route {
  points: [lat: number, lng: number][];
  /** `[[minLat, minLng], [maxLat, maxLng]]`. */
  bounds: [[minLat: number, minLng: number], [maxLat: number, maxLng: number]];
}
