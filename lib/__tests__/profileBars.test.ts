import { profileBars, rampPolygonPoints, roundedTopPath } from '../profileBars';
import type { WorkoutBlock } from '../workoutProfile';

describe('profileBars', () => {
  it('splits the width between the blocks by widthFraction, less the gaps between them', () => {
    const blocks: WorkoutBlock[] = [
      { widthFraction: 0.75, minPct: 50, maxPct: 50, zone: 1 },
      { widthFraction: 0.25, minPct: 100, maxPct: 100, zone: 4 },
    ];

    // 102px wide with one 2px gap leaves 100px: 75 and 25.
    const bars = profileBars(blocks, { width: 102, height: 40, gap: 2 });

    expect(bars.map(bar => [bar.x, bar.width])).toEqual([
      [0, 75],
      [77, 25],
    ]);
  });

  it('scales heights against the tallest block, with a range capped above its floor', () => {
    const blocks: WorkoutBlock[] = [
      { widthFraction: 0.5, minPct: 40, maxPct: 40, zone: 1 },
      { widthFraction: 0.5, minPct: 160, maxPct: 200, zone: 6 },
    ];

    // Ceiling 200% FTP on a 50px plot: 4% FTP per px, y measured from the top.
    const bars = profileBars(blocks, { width: 100, height: 50, gap: 0 });

    expect(bars.map(bar => [bar.capY, bar.floorY])).toEqual([
      [40, 40],
      [0, 10],
    ]);
  });

  it('gives a ramp the heights it starts and ends at, in ridden order', () => {
    const blocks: WorkoutBlock[] = [
      {
        widthFraction: 0.5,
        minPct: 50,
        maxPct: 100,
        zone: 2,
        ramp: { startPct: 50, endPct: 100 },
      },
      {
        widthFraction: 0.5,
        minPct: 25,
        maxPct: 75,
        zone: 2,
        ramp: { startPct: 75, endPct: 25 },
      },
    ];

    const bars = profileBars(blocks, { width: 100, height: 40, gap: 0 });

    expect(bars.map(bar => bar.ramp)).toEqual([
      { startY: 20, endY: 0 },
      { startY: 10, endY: 30 },
    ]);
  });

  it('gives a range or a flat step no ramp', () => {
    const blocks: WorkoutBlock[] = [
      { widthFraction: 0.5, minPct: 80, maxPct: 100, zone: 4 },
      { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
    ];

    const bars = profileBars(blocks, { width: 100, height: 40, gap: 0 });

    expect(bars.map(bar => bar.ramp)).toEqual([undefined, undefined]);
  });

  it('drops the gaps when they would leave the bars no width', () => {
    const blocks: WorkoutBlock[] = Array.from({ length: 30 }, () => ({
      widthFraction: 1 / 30,
      minPct: 100,
      maxPct: 100,
      zone: 4 as const,
    }));

    // 29 gaps of 2px would take 58px of a 30px tile.
    const bars = profileBars(blocks, { width: 30, height: 40, gap: 2 });

    expect(bars.every(bar => bar.width > 0)).toBe(true);
    expect(bars[29].x + bars[29].width).toBeCloseTo(30);
  });

  it("carries each block's zone and says whether it is flat, a range or a ramp", () => {
    const blocks: WorkoutBlock[] = [
      { widthFraction: 0.25, minPct: 60, maxPct: 60, zone: 2 },
      { widthFraction: 0.25, minPct: 80, maxPct: 100, zone: 4 },
      {
        widthFraction: 0.5,
        minPct: 50,
        maxPct: 100,
        zone: 3,
        ramp: { startPct: 50, endPct: 100 },
      },
    ];

    const bars = profileBars(blocks, { width: 100, height: 40, gap: 0 });

    expect(bars.map(bar => [bar.zone, bar.shape])).toEqual([
      [2, 'flat'],
      [4, 'range'],
      [3, 'ramp'],
    ]);
  });

  it('draws nothing when no block asks for any power', () => {
    const blocks: WorkoutBlock[] = [
      { widthFraction: 1, minPct: 0, maxPct: 0, zone: 1 },
    ];

    expect(profileBars(blocks, { width: 100, height: 40, gap: 2 })).toEqual([]);
  });
});

describe('roundedTopPath', () => {
  it('outlines a bar with its top corners rounded', () => {
    expect(
      roundedTopPath({ x: 0, y: 10, width: 20, bottom: 40, radius: 4 }),
    ).toBe('M0,40 V14 Q0,10 4,10 H16 Q20,10 20,14 V40 Z');
  });

  it('shrinks the radius to fit a bar narrower or shorter than two radii', () => {
    expect(
      roundedTopPath({ x: 10, y: 37, width: 4, bottom: 40, radius: 4 }),
    ).toBe('M10,40 V39 Q10,37 12,37 H12 Q14,37 14,39 V40 Z');
  });

  it('outlines nothing for a bar with no width', () => {
    expect(
      roundedTopPath({ x: 0, y: 10, width: 0, bottom: 40, radius: 4 }),
    ).toBe('');
  });

  it('outlines nothing for a bar with no height', () => {
    expect(
      roundedTopPath({ x: 0, y: 40, width: 20, bottom: 40, radius: 4 }),
    ).toBe('');
  });
});

describe('rampPolygonPoints', () => {
  it('outlines a slope from its start height on the left to its end height on the right', () => {
    expect(
      rampPolygonPoints({ x: 10, width: 20, bottom: 40, startY: 30, endY: 5 }),
    ).toBe('10,40 10,30 30,5 30,40');
  });
});
