import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { ofmDarkStyle } from '@/constants/ofmDarkStyle';
import { useAppTheme } from '@/constants/theme';
import type { Route } from '@/lib/route';
import { routeMapData } from '@/lib/routeMapData';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type MapProps,
  type MapRef,
  type ViewPadding,
} from '@maplibre/maplibre-react-native';

const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;

/** MapLibre's own ⓘ corner, which the replacement button keeps. */
const DEFAULT_ATTRIBUTION_POSITION = { bottom: 8, left: 8 } as const;
const ATTRIBUTION_ICON_SIZE = 22;

interface RouteMapProps {
  route: Route;
  /** Space kept clear around the Route when the camera fits to its bounds. */
  padding: ViewPadding;
  /** Pan and zoom when true; no gestures at all when false. Never rotates or tilts. */
  interactive: boolean;
  /** Where the attribution ⓘ sits; bottom-left when absent. */
  attributionPosition?: MapProps['attributionPosition'];
}

/**
 * Draws a Route on a dark map: a thin orange line with green start and red
 * finish dots. The map's own contents are hidden from the screen reader; the
 * attribution ⓘ is the component's own button, after the map in the tree, so
 * it stays focusable and opens MapLibre's attribution dialog.
 */
export default function RouteMap({
  route,
  padding,
  interactive,
  attributionPosition = DEFAULT_ATTRIBUTION_POSITION,
}: RouteMapProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation(undefined, { keyPrefix: 'route.map' });
  const mapRef = useRef<MapRef>(null);
  const { line, markers, bounds } = routeMapData(route);

  return (
    <View style={{ flex: 1 }}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ flex: 1 }}
      >
        <Map
          ref={mapRef}
          style={{ flex: 1 }}
          mapStyle={ofmDarkStyle}
          dragPan={interactive}
          touchZoom={interactive}
          doubleTapZoom={interactive}
          doubleTapHoldZoom={interactive}
          touchRotate={false}
          touchPitch={false}
          compass={false}
          logo={false}
          // Replaced by the button below, which a hidden map can't hide.
          attribution={false}
        >
          <Camera initialViewState={{ bounds, padding }} />

          <GeoJSONSource id="route" data={line}>
            <Layer
              id="route-line"
              type="line"
              layout={LINE_LAYOUT}
              paint={{ 'line-color': colors.zone5, 'line-width': 3 }}
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
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('attribution')}
        onPress={() => void mapRef.current?.showAttribution()}
        hitSlop={11}
        style={{ position: 'absolute', ...attributionPosition }}
      >
        <Ionicons
          name="information-circle-outline"
          size={ATTRIBUTION_ICON_SIZE}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}
