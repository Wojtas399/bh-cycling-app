import { formatRouteDistance, routeChips } from '../routeChips';

const SUMMARY = {
  activityId: 'i42',
  distanceMeters: 42_317,
  startLocal: '2026-10-17T07:05:00',
  finishLocal: '2026-10-17T08:40:00',
};

describe('routeChips', () => {
  it('lists distance, start and finish, formatted, in that order', () => {
    expect(routeChips(SUMMARY)).toEqual([
      { chip: 'distance', value: '42,3 km' },
      { chip: 'start', value: '7:05' },
      { chip: 'finish', value: '8:40' },
    ]);
  });

  it('leaves out the distance when the summary has none', () => {
    const { distanceMeters: _, ...summary } = SUMMARY;

    expect(routeChips(summary)).toEqual([
      { chip: 'start', value: '7:05' },
      { chip: 'finish', value: '8:40' },
    ]);
  });

  it('leaves out the finish when the summary has none', () => {
    const { finishLocal: _, ...summary } = SUMMARY;

    expect(routeChips(summary)).toEqual([
      { chip: 'distance', value: '42,3 km' },
      { chip: 'start', value: '7:05' },
    ]);
  });

  it('keeps a zero distance', () => {
    expect(routeChips({ ...SUMMARY, distanceMeters: 0 })[0]).toEqual({
      chip: 'distance',
      value: '0,0 km',
    });
  });
});

describe('formatRouteDistance', () => {
  it('formats the distance in km with a decimal comma', () => {
    expect(formatRouteDistance({ distanceMeters: 42_317 })).toBe('42,3 km');
  });

  it('is undefined without a distance', () => {
    expect(formatRouteDistance({})).toBeUndefined();
  });
});
