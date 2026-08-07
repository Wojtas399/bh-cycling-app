import type { ZoneConfig } from '../powerZones';
import { buildWorkoutProfile, profileCeilingPct } from '../workoutProfile';

// Spelled out rather than resolved, so these expectations stay pinned to the
// bands under test instead of following whatever powerZones defaults to.
const CONFIG: ZoneConfig = [
  { zone: 1, minPct: 0, maxPct: 55 },
  { zone: 2, minPct: 55, maxPct: 75 },
  { zone: 3, minPct: 75, maxPct: 90 },
  { zone: 4, minPct: 90, maxPct: 105 },
  { zone: 5, minPct: 105, maxPct: 120 },
  { zone: 6, minPct: 120, maxPct: 150 },
  { zone: 7, minPct: 150, maxPct: 200 },
];

const SPRINT_IN_A_LONG_RIDE = [
  { duration: 3600, power: { units: 'power_zone', value: 2 } },
  { duration: 30, power: { units: 'power_zone', value: 7 } },
  { duration: 3570, power: { units: 'power_zone', value: 2 } },
];

const THRESHOLD_2X20 = [
  { duration: 600, power: { units: '%ftp', start: 50, end: 90 } },
  { duration: 1200, power: { units: '%ftp', start: 95, end: 105 } },
  { duration: 300, power: { units: 'power_zone', value: 1 } },
  { duration: 1200, power: { units: '%ftp', start: 95, end: 105 } },
  { duration: 300, power: { units: 'power_zone', value: 1 } },
];

describe('workoutProfile', () => {
  it('buildWorkoutProfile returns no blocks when the workout has no steps', () => {
    expect(buildWorkoutProfile([], CONFIG)).toEqual([]);
    expect(buildWorkoutProfile(undefined, CONFIG)).toEqual([]);
    expect(buildWorkoutProfile(null, CONFIG)).toEqual([]);
  });

  it('buildWorkoutProfile renders a flat recovery ride as exactly one block', () => {
    const steps = [
      { duration: 3600, power: { units: 'power_zone', value: 1 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)).toEqual([
      { widthFraction: 1, minPct: 0, maxPct: 55, zone: 1 },
    ]);
  });

  it('buildWorkoutProfile expands a power_zone target to that zone %FTP band', () => {
    const steps = [
      { duration: 1200, power: { units: 'power_zone', value: 4 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)).toEqual([
      { widthFraction: 1, minPct: 90, maxPct: 105, zone: 4 },
    ]);
  });

  it('buildWorkoutProfile expands a power_zone target against the athlete own bands', () => {
    const config: ZoneConfig = [
      { zone: 1, minPct: 0, maxPct: 60 },
      { zone: 2, minPct: 60, maxPct: 80 },
      { zone: 3, minPct: 80, maxPct: 95 },
      { zone: 4, minPct: 95, maxPct: 110 },
    ];
    const steps = [
      { duration: 1200, power: { units: 'power_zone', value: 4 } },
    ];

    expect(buildWorkoutProfile(steps, config)).toEqual([
      { widthFraction: 1, minPct: 95, maxPct: 110, zone: 4 },
    ]);
  });

  it('buildWorkoutProfile uses a %ftp range as-is, as a genuine min-max band', () => {
    const steps = [
      { duration: 1200, power: { units: '%ftp', start: 95, end: 105 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)).toEqual([
      { widthFraction: 1, minPct: 95, maxPct: 105, zone: 4 },
    ]);
  });

  it('buildWorkoutProfile gives a single-value %ftp target an equal min and max', () => {
    const steps = [{ duration: 900, power: { units: '%ftp', value: 65 } }];

    expect(buildWorkoutProfile(steps, CONFIG)).toEqual([
      { widthFraction: 1, minPct: 65, maxPct: 65, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile prefers the range over a single value when a step carries both', () => {
    const steps = [
      {
        duration: 600,
        power: { units: '%ftp', value: 100, start: 95, end: 105 },
      },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)[0]).toMatchObject({
      minPct: 95,
      maxPct: 105,
    });
  });

  it('buildWorkoutProfile keeps a ramp as a rising band, coloured by its middle', () => {
    const steps = [
      { duration: 600, power: { units: '%ftp', start: 50, end: 90 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)).toEqual([
      { widthFraction: 1, minPct: 50, maxPct: 90, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile orders a descending ramp into min-max', () => {
    const steps = [
      { duration: 600, power: { units: '%ftp', start: 90, end: 50 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG)[0]).toMatchObject({
      minPct: 50,
      maxPct: 90,
    });
  });

  it('buildWorkoutProfile never turns a Sweet Spot effort into its own zone', () => {
    // Sweet Spot straddles Z3/Z4, so it must resolve to the underlying zone.
    const steps = [
      { duration: 1200, power: { units: '%ftp', start: 84, end: 97 } },
      { duration: 1200, power: { units: '%ftp', start: 84, end: 88 } },
    ];

    expect(buildWorkoutProfile(steps, CONFIG).map(block => block.zone)).toEqual(
      [4, 3],
    );
  });

  it('buildWorkoutProfile sizes each block by its share of the workout duration', () => {
    // 2x20 threshold: 10min ramp, 20min on, 5min off, 20min on, 5min cooldown.
    const blocks = buildWorkoutProfile(THRESHOLD_2X20, CONFIG);

    expect(blocks.map(block => block.widthFraction)).toEqual([
      1 / 6,
      1 / 3,
      1 / 12,
      1 / 3,
      1 / 12,
    ]);
  });

  it('buildWorkoutProfile keeps the steps in time order', () => {
    const blocks = buildWorkoutProfile(THRESHOLD_2X20, CONFIG);

    expect(blocks.map(block => block.zone)).toEqual([2, 4, 1, 4, 1]);
    expect(blocks.map(block => block.maxPct)).toEqual([90, 105, 55, 105, 55]);
  });

  it('buildWorkoutProfile block widths always add up to the full profile', () => {
    const total = buildWorkoutProfile(THRESHOLD_2X20, CONFIG).reduce(
      (sum, block) => sum + block.widthFraction,
      0,
    );

    expect(total).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile skips steps it cannot place on a %FTP axis', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 1800, power: { units: 'power_zone', value: 2 } },
        { duration: 600 },
        { duration: 600, power: { units: 'hr_zone', value: 3 } },
        { duration: 600, power: { units: '%ftp' } },
        { duration: 1800, power: { units: 'power_zone', value: 4 } },
      ],
      CONFIG,
    );

    expect(blocks.map(block => block.zone)).toEqual([2, 4]);
    expect(blocks.map(block => block.widthFraction)).toEqual([0.5, 0.5]);
  });

  it('buildWorkoutProfile skips steps with no usable duration', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 1800, power: { units: 'power_zone', value: 2 } },
        { power: { units: 'power_zone', value: 4 } },
        { duration: 0, power: { units: 'power_zone', value: 5 } },
        { duration: -60, power: { units: 'power_zone', value: 6 } },
      ],
      CONFIG,
    );

    expect(blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile returns no blocks when nothing in the workout is drawable', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 1800, power: { units: 'hr_zone', value: 3 } },
        { duration: 1800 },
      ],
      CONFIG,
    );

    expect(blocks).toEqual([]);
  });

  it('buildWorkoutProfile still draws a profile when only a small part of the ride is skipped', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 3000, power: { units: 'power_zone', value: 2 } },
        { duration: 600 },
      ],
      CONFIG,
    );

    expect(blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile draws nothing when the skipped steps are most of the ride', () => {
    // Skipped steps hand their width over, so a 20min interval next to a 60min
    // unplaceable one would otherwise be drawn as the entire session.
    const blocks = buildWorkoutProfile(
      [
        { duration: 3600, power: { units: 'hr_zone', value: 3 } },
        { duration: 1200, power: { units: '%ftp', value: 100 } },
      ],
      CONFIG,
    );

    expect(blocks).toEqual([]);
  });

  it('buildWorkoutProfile draws nothing when no step asks for any power', () => {
    const blocks = buildWorkoutProfile(
      [{ duration: 1800, power: { units: '%ftp', value: 0 } }],
      CONFIG,
    );

    expect(blocks).toEqual([]);
  });

  it('profileCeilingPct is positive for every profile buildWorkoutProfile returns', () => {
    const workouts = [
      THRESHOLD_2X20,
      SPRINT_IN_A_LONG_RIDE,
      [{ duration: 1800, power: { units: 'power_zone', value: 1 } }],
      [{ duration: 1800, power: { units: '%ftp', start: 0, end: 1 } }],
    ];

    for (const steps of workouts) {
      const blocks = buildWorkoutProfile(steps, CONFIG);

      expect(blocks.length).toBeGreaterThan(0);
      expect(profileCeilingPct(blocks)).toBeGreaterThan(0);
    }
  });

  it('buildWorkoutProfile floors a very short sprint so it stays visible', () => {
    // A 30s sprint is 0.4% of a 2h ride: a hairline without the floor.
    const blocks = buildWorkoutProfile(SPRINT_IN_A_LONG_RIDE, CONFIG);

    expect(blocks[1].widthFraction).toBe(0.01);
  });

  it('buildWorkoutProfile takes the floored width off the longer steps, keeping the total whole', () => {
    const blocks = buildWorkoutProfile(SPRINT_IN_A_LONG_RIDE, CONFIG);

    expect(blocks[0].widthFraction).toBeCloseTo(0.4971, 4);
    expect(blocks[2].widthFraction).toBeCloseTo(0.4929, 4);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile keeps every burst of a microburst session visible', () => {
    // 30x 10s on / 50s off: every burst is under the floor on its own.
    const steps = Array.from({ length: 30 }, () => [
      { duration: 10, power: { units: 'power_zone', value: 6 } },
      { duration: 50, power: { units: 'power_zone', value: 2 } },
    ]).flat();
    const blocks = buildWorkoutProfile(steps, CONFIG);

    expect(blocks).toHaveLength(60);
    expect(blocks.every(block => block.widthFraction >= 0.01)).toBe(true);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile drops the floor when there are too many steps to fit it, keeping the shape honest', () => {
    // 150 blocks cannot all clear the floor, so proportions win over visibility.
    const steps = [
      ...Array.from({ length: 149 }, () => ({
        duration: 15,
        power: { units: 'power_zone', value: 6 },
      })),
      { duration: 3600, power: { units: 'power_zone', value: 2 } },
    ];
    const blocks = buildWorkoutProfile(steps, CONFIG);

    expect(blocks[149].widthFraction).toBeCloseTo(0.617, 3);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('profileCeilingPct is the workout own maximum power, so its tallest block fills the height', () => {
    const blocks = buildWorkoutProfile(THRESHOLD_2X20, CONFIG);
    const ceiling = profileCeilingPct(blocks);

    expect(ceiling).toBe(105);
    expect(Math.max(...blocks.map(block => block.maxPct / ceiling))).toBe(1);
  });

  it('profileCeilingPct scales an easy ride against its own ceiling, not a shared one', () => {
    const easyRide = buildWorkoutProfile(
      [{ duration: 5400, power: { units: '%ftp', start: 60, end: 70 } }],
      CONFIG,
    );

    expect(profileCeilingPct(easyRide)).toBe(70);
  });

  it('profileCeilingPct is zero for an empty profile', () => {
    expect(profileCeilingPct([])).toBe(0);
  });
});
