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

const MAPLIBRE_ATTRIBUTION_CORNER = { bottom: 8, left: 8 } as const;
const ATTRIBUTION_ICON_SIZE = 22;

interface RouteMapProps {
  route: Route;
  routeFitPadding: ViewPadding;
  interactive: boolean;
  attributionPosition?: MapProps['attributionPosition'];
}

export default function RouteMap({
  route,
  routeFitPadding,
  interactive,
  attributionPosition = MAPLIBRE_ATTRIBUTION_CORNER,
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
          attribution={false}
        >
          <Camera initialViewState={{ bounds, padding: routeFitPadding }} />

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

      <AttributionFocusableOutsideHiddenMap
        label={t('attribution')}
        color={colors.textSecondary}
        onPress={() => void mapRef.current?.showAttribution()}
        position={attributionPosition}
      />
    </View>
  );
}

function AttributionFocusableOutsideHiddenMap({
  label,
  color,
  onPress,
  position,
}: {
  label: string;
  color: string;
  onPress: () => void;
  position: MapProps['attributionPosition'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={11}
      style={{ position: 'absolute', ...position }}
    >
      <Ionicons
        name="information-circle-outline"
        size={ATTRIBUTION_ICON_SIZE}
        color={color}
      />
    </Pressable>
  );
}
