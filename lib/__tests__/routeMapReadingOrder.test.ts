import { inRouteMapReadingOrder } from '@/lib/routeMapReadingOrder';

describe('inRouteMapReadingOrder', () => {
  it('starts screen-reader focus on the ✕ and ends on the map, whose attribution ⓘ stays focusable after the chips', () => {
    expect(
      inRouteMapReadingOrder({
        map: 'map',
        chips: 'chips',
        close: 'close',
        mapImage: 'mapImage',
      }),
    ).toEqual([
      ['close', 'close'],
      ['mapImage', 'mapImage'],
      ['chips', 'chips'],
      ['map', 'map'],
    ]);
  });

  it('frames the map’s image between the ✕ and the chips', () => {
    expect(
      inRouteMapReadingOrder({ chips: 'chips', mapImage: 'mapImage' }).map(
        ([layer]) => layer,
      ),
    ).toEqual(['mapImage', 'chips']);
  });

  it('leaves out a layer the screen doesn’t show', () => {
    expect(
      inRouteMapReadingOrder({ close: 'close', map: 'state' }).map(
        ([layer]) => layer,
      ),
    ).toEqual(['close', 'map']);
  });
});
