import { toWellnessRows } from '../wellness';

describe('toWellnessRows', () => {
  it("lists the metrics in the card's fixed order, each with its unit", () => {
    expect(
      toWellnessRows({
        restingHR: 48,
        hrv: 62,
        sleepScore: 81,
        sleepSecs: 7 * 3600 + 25 * 60,
        readiness: 74,
      }),
    ).toEqual([
      { key: 'readiness', value: '74' },
      { key: 'sleep', value: '7h 25m' },
      { key: 'sleepScore', value: '81' },
      { key: 'hrv', value: '62 ms' },
      { key: 'restingHr', value: '48 bpm' },
    ]);
  });

  it('rounds as the only arithmetic on what intervals.icu sent', () => {
    expect(toWellnessRows({ readiness: 73.6, hrv: 61.4 })).toEqual([
      { key: 'readiness', value: '74' },
      { key: 'hrv', value: '61 ms' },
    ]);
  });

  it('leaves out a null or absent metric but shows a 0', () => {
    expect(
      toWellnessRows({ readiness: 0, sleepScore: null, restingHR: undefined }),
    ).toEqual([{ key: 'readiness', value: '0' }]);
  });

  it('shows SDNN only when rMSSD is missing', () => {
    expect(toWellnessRows({ hrv: null, hrvSDNN: 45 })).toEqual([
      { key: 'hrvSdnn', value: '45 ms' },
    ]);
  });

  it('never shows rMSSD and SDNN together', () => {
    expect(toWellnessRows({ hrv: 62, hrvSDNN: 45 })).toEqual([
      { key: 'hrv', value: '62 ms' },
    ]);
  });
});
