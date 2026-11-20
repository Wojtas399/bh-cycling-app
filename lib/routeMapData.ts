import type { Route } from './route';

export type RouteMarkerKind = 'start' | 'finish';

export interface RouteMapData {
  line: GeoJSON.Feature<GeoJSON.LineString>;
  markers: GeoJSON.FeatureCollection<GeoJSON.Point, { kind: RouteMarkerKind }>;
  bounds: [west: number, south: number, east: number, north: number];
}

export function routeMapData(route: Route): RouteMapData {
  const coordinates = route.points.map(([lat, lng]) => [lng, lat]);
  const [[minLat, minLng], [maxLat, maxLng]] = route.bounds;

  return {
    line: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    },
    markers: {
      type: 'FeatureCollection',
      features: [
        marker('start', coordinates[0]),
        marker('finish', coordinates[coordinates.length - 1]),
      ],
    },
    bounds: [minLng, minLat, maxLng, maxLat],
  };
}

function marker(
  kind: RouteMarkerKind,
  coordinates: GeoJSON.Position,
): GeoJSON.Feature<GeoJSON.Point, { kind: RouteMarkerKind }> {
  return {
    type: 'Feature',
    properties: { kind },
    geometry: { type: 'Point', coordinates },
  };
}
