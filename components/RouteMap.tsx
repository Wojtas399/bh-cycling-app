import ofmDark from '@/assets/map/ofm-dark.json';
import { useAppTheme } from '@/constants/theme';
import type { Route } from '@/lib/route';
import { routeMapData } from '@/lib/routeMapData';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type MapProps,
  type StyleSpecification,
  type ViewPadding,
} from '@maplibre/maplibre-react-native';

/**
 * OpenFreeMap's "Dark" style, bundled so the map never fetches its style.
 * If OpenFreeMap is down only the streets go missing, never the Route (ADR-0008).
 */
const mapStyle = ofmDark as unknown as StyleSpecification;

const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;

interface RouteMapProps {
  route: Route;
  /** Space kept clear around the Route when the camera fits to its bounds. */
  padding: ViewPadding;
  /** Pan and zoom when true; no gestures at all when false. Never rotates or tilts. */
  interactive: boolean;
  /** Where the attribution ⓘ sits; MapLibre's default corner when absent. */
  attributionPosition?: MapProps['attributionPosition'];
}

/** Draws a Route on a dark map: a glowing orange line with green start and red finish dots. */
export default function RouteMap({
  route,
  padding,
  interactive,
  attributionPosition,
}: RouteMapProps) {
  const { colors } = useAppTheme();
  const { line, markers, bounds } = routeMapData(route);

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      attribution
      attributionPosition={attributionPosition}
    >
      <Camera initialViewState={{ bounds, padding }} />

      <GeoJSONSource id="route" data={line}>
        <Layer
          id="route-glow"
          type="line"
          layout={LINE_LAYOUT}
          paint={{
            'line-color': colors.zone5,
            'line-width': 12,
            'line-opacity': 0.25,
            'line-blur': 4,
          }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={LINE_LAYOUT}
          paint={{ 'line-color': colors.zone5, 'line-width': 4 }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="route-markers" data={markers}>
        <Layer
          id="route-markers-circle"
          type="circle"
          paint={{
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': colors.black,
            'circle-color': [
              'match',
              ['get', 'kind'],
              'start',
              colors.green,
              colors.red,
            ],
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}
