const ROUTE_MAP_READING_ORDER = ['close', 'mapImage', 'chips', 'map'] as const;

export type RouteMapLayer = (typeof ROUTE_MAP_READING_ORDER)[number];

export function inRouteMapReadingOrder<T>(
  layers: Partial<Record<RouteMapLayer, T>>,
): [RouteMapLayer, T][] {
  return ROUTE_MAP_READING_ORDER.flatMap(layer => {
    const content = layers[layer];

    return content === undefined ? [] : [[layer, content]];
  });
}
