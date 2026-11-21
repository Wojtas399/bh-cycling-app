import type { Route } from '../route';
import { routeMapData } from '../routeMapData';

const krakowBloniaToWawelToKazimierz: Route = {
  points: [
    [50.0614, 19.9097],
    [50.0541, 19.9354],
    [50.0513, 19.9449],
  ],
  bounds: [
    [50.0513, 19.9097],
    [50.0614, 19.9449],
  ],
};

describe('routeMapData', () => {
  it('draws the line through every point in GeoJSON [lng, lat] order', () => {
    expect(routeMapData(krakowBloniaToWawelToKazimierz).line.geometry).toEqual({
      type: 'LineString',
      coordinates: [
        [19.9097, 50.0614],
        [19.9354, 50.0541],
        [19.9449, 50.0513],
      ],
    });
  });

  it('marks the first point as the start and the last as the finish', () => {
    const markers = routeMapData(
      krakowBloniaToWawelToKazimierz,
    ).markers.features.map(f => ({
      kind: f.properties?.kind,
      geometry: f.geometry,
    }));

    expect(markers).toEqual([
      {
        kind: 'start',
        geometry: { type: 'Point', coordinates: [19.9097, 50.0614] },
      },
      {
        kind: 'finish',
        geometry: { type: 'Point', coordinates: [19.9449, 50.0513] },
      },
    ]);
  });

  it("fits the camera to the Route's bounds as [west, south, east, north]", () => {
    expect(routeMapData(krakowBloniaToWawelToKazimierz).bounds).toEqual([
      19.9097, 50.0513, 19.9449, 50.0614,
    ]);
  });
});
