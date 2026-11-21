# Route maps use MapLibre with OpenFreeMap

## Status

Accepted

## Context

Workout Details shows the Route of a completed outdoor ride on a map: a static banner and a full-screen map with pan and zoom (#152). The map needs a dark basemap with streets and labels, has to fit the camera to the Route's bounds, and has to turn gestures off for the banner so scrolling passes through. The app avoids paid cloud billing where a free option is good enough.

## Decision

- Route maps use `@maplibre/maplibre-react-native` (verified on 11.5.0) through its Expo config plugin. `expo-build-properties` is unchanged.
- The basemap is OpenFreeMap's "Dark" style. Its style JSON is bundled in the app (`constants/ofmDarkStyle.ts`) and the map loads its style from that file, not from a URL. Tiles, sprites and glyphs still come from OpenFreeMap.
- One shared component, `components/RouteMap.tsx`, draws the Route on both maps. Turning a Route into GeoJSON and camera bounds is the pure `lib/routeMapData.ts`.

### Considered and rejected

- **`react-native-maps` / `expo-maps`:** Google Maps on Android needs an API key and a billing account. `expo-maps` is also alpha, and on iOS it can't fit to bounds or turn off gestures.
- **A tile-less SVG line:** no geography to recognise the area by, and pan and zoom would have to be hand-built.

## Consequences

- OpenFreeMap has no SLA. This is accepted: because the style is bundled, an outage drops only the streets and labels, never the Route line.
- The escape hatch is a paid host (Stadia, MapTiler) or a self-hosted Protomaps extract. It's a small code change (a new style asset), but it needs an app release.
- MapLibre is a native module, so adding it needed new dev clients. It adds about 16 MB on iOS debug and about 10.5 MB per Android ABI, uncompressed.
- The attribution ⓘ must stay on to credit OpenStreetMap and OpenFreeMap. The MapLibre logo and compass are off.
