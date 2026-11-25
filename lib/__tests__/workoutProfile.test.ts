import type { ZoneConfig } from '../powerZones';
import {
  type WorkoutStep,
  buildWorkoutProfile,
  hasWorkoutProfile,
  profileCeilingPct,
  stepsAtTheirTime,
} from '../workoutProfile';

const SPELLED_OUT_COGGAN_BANDS: ZoneConfig = [
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
    expect(buildWorkoutProfile([], SPELLED_OUT_COGGAN_BANDS)).toEqual([]);
    expect(buildWorkoutProfile(undefined, SPELLED_OUT_COGGAN_BANDS)).toEqual(
      [],
    );
    expect(buildWorkoutProfile(null, SPELLED_OUT_COGGAN_BANDS)).toEqual([]);
  });

  it('buildWorkoutProfile renders a flat recovery ride as exactly one block', () => {
    const steps = [
      { duration: 3600, power: { units: 'power_zone', value: 1 } },
    ];

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
      { widthFraction: 1, minPct: 0, maxPct: 55, zone: 1 },
    ]);
  });

  it('buildWorkoutProfile expands a power_zone target to that zone %FTP band', () => {
    const steps = [
      { duration: 1200, power: { units: 'power_zone', value: 4 } },
    ];

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
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

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
      { widthFraction: 1, minPct: 95, maxPct: 105, zone: 4 },
    ]);
  });

  it('buildWorkoutProfile gives a single-value %ftp target an equal min and max', () => {
    const steps = [{ duration: 900, power: { units: '%ftp', value: 65 } }];

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
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

    expect(
      buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)[0],
    ).toMatchObject({
      minPct: 95,
      maxPct: 105,
    });
  });

  it('buildWorkoutProfile keeps a ramp as a rising band, coloured by its middle', () => {
    const steps = [
      { duration: 600, power: { units: '%ftp', start: 50, end: 90 } },
    ];

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
      { widthFraction: 1, minPct: 50, maxPct: 90, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile orders a descending ramp into min-max', () => {
    const steps = [
      { duration: 600, power: { units: '%ftp', start: 90, end: 50 } },
    ];

    expect(
      buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)[0],
    ).toMatchObject({
      minPct: 50,
      maxPct: 90,
    });
  });

  describe('ramps', () => {
    it('buildWorkoutProfile keeps a ramp up rising, in the order it is ridden', () => {
      const steps = [
        {
          duration: 600,
          ramp: true,
          power: { units: '%ftp', start: 50, end: 90 },
        },
      ];

      expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
        {
          widthFraction: 1,
          minPct: 50,
          maxPct: 90,
          zone: 2,
          ramp: { startPct: 50, endPct: 90 },
        },
      ]);
    });

    it('buildWorkoutProfile keeps a ramp down falling', () => {
      const steps = [
        {
          duration: 600,
          ramp: true,
          power: { units: '%ftp', start: 90, end: 50 },
        },
      ];

      expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)[0]).toEqual({
        widthFraction: 1,
        minPct: 50,
        maxPct: 90,
        zone: 2,
        ramp: { startPct: 90, endPct: 50 },
      });
    });

    it('buildWorkoutProfile does not treat a range as a ramp', () => {
      const steps = [
        { duration: 600, power: { units: '%ftp', start: 90, end: 50 } },
      ];

      expect(
        buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)[0].ramp,
      ).toBeUndefined();
    });

    it('buildWorkoutProfile draws a ramp with equal ends flat', () => {
      const steps = [
        {
          duration: 600,
          ramp: true,
          power: { units: '%ftp', start: 70, end: 70 },
        },
      ];

      expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
        { widthFraction: 1, minPct: 70, maxPct: 70, zone: 2 },
      ]);
    });

    it('buildWorkoutProfile runs a power_zone ramp across its zone band', () => {
      const steps = [
        { duration: 420, ramp: true, power: { units: 'power_zone', value: 1 } },
      ];

      expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)[0]).toEqual({
        widthFraction: 1,
        minPct: 0,
        maxPct: 55,
        zone: 1,
        ramp: { startPct: 0, endPct: 55 },
      });
    });

    it('buildWorkoutProfile keeps the direction of ramps inside repeats on every rep', () => {
      const steps = [
        {
          reps: 2,
          duration: 1200,
          steps: [
            {
              duration: 300,
              ramp: true,
              power: { units: '%ftp', start: 60, end: 100 },
            },
            {
              duration: 300,
              ramp: true,
              power: { units: '%ftp', start: 100, end: 60 },
            },
          ],
        },
      ];

      expect(
        buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS).map(
          block => block.ramp,
        ),
      ).toEqual([
        { startPct: 60, endPct: 100 },
        { startPct: 100, endPct: 60 },
        { startPct: 60, endPct: 100 },
        { startPct: 100, endPct: 60 },
      ]);
    });
  });

  it('buildWorkoutProfile never turns a Sweet Spot effort into its own zone, only its underlying Z3 or Z4', () => {
    const steps = [
      { duration: 1200, power: { units: '%ftp', start: 84, end: 97 } },
      { duration: 1200, power: { units: '%ftp', start: 84, end: 88 } },
    ];

    expect(
      buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS).map(
        block => block.zone,
      ),
    ).toEqual([4, 3]);
  });

  it('buildWorkoutProfile sizes each block by its share of the workout duration', () => {
    const blocks = buildWorkoutProfile(
      THRESHOLD_2X20,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks.map(block => block.widthFraction)).toEqual([
      1 / 6,
      1 / 3,
      1 / 12,
      1 / 3,
      1 / 12,
    ]);
  });

  it('buildWorkoutProfile keeps the steps in time order', () => {
    const blocks = buildWorkoutProfile(
      THRESHOLD_2X20,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks.map(block => block.zone)).toEqual([2, 4, 1, 4, 1]);
    expect(blocks.map(block => block.maxPct)).toEqual([90, 105, 55, 105, 55]);
  });

  it('buildWorkoutProfile block widths always add up to the full profile', () => {
    const total = buildWorkoutProfile(
      THRESHOLD_2X20,
      SPELLED_OUT_COGGAN_BANDS,
    ).reduce((sum, block) => sum + block.widthFraction, 0);

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
      SPELLED_OUT_COGGAN_BANDS,
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
      SPELLED_OUT_COGGAN_BANDS,
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
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toEqual([]);
  });

  it('buildWorkoutProfile still draws a profile when only a small part of the ride is skipped', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 3000, power: { units: 'power_zone', value: 2 } },
        { duration: 600 },
      ],
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('buildWorkoutProfile draws nothing when the skipped steps are most of the ride, rather than a 20min interval as the whole session', () => {
    const blocks = buildWorkoutProfile(
      [
        { duration: 3600, power: { units: 'hr_zone', value: 3 } },
        { duration: 1200, power: { units: '%ftp', value: 100 } },
      ],
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toEqual([]);
  });

  it('buildWorkoutProfile draws nothing when no step asks for any power', () => {
    const blocks = buildWorkoutProfile(
      [{ duration: 1800, power: { units: '%ftp', value: 0 } }],
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toEqual([]);
  });

  it('buildWorkoutProfile never draws a block below the axis, flooring negative %FTP at zero', () => {
    const blocks = buildWorkoutProfile(
      [
        {
          duration: 1800,
          ramp: true,
          power: { units: '%ftp', start: -20, end: 60 },
        },
      ],
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toEqual([
      {
        widthFraction: 1,
        minPct: 0,
        maxPct: 60,
        zone: 1,
        ramp: { startPct: 0, endPct: 60 },
      },
    ]);
  });

  it('profileCeilingPct is positive for every profile buildWorkoutProfile returns', () => {
    const workouts = [
      THRESHOLD_2X20,
      SPRINT_IN_A_LONG_RIDE,
      [{ duration: 1800, power: { units: 'power_zone', value: 1 } }],
      [{ duration: 1800, power: { units: '%ftp', start: 0, end: 1 } }],
    ];

    for (const steps of workouts) {
      const blocks = buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS);

      expect(blocks.length).toBeGreaterThan(0);
      expect(profileCeilingPct(blocks)).toBeGreaterThan(0);
    }
  });

  it('buildWorkoutProfile floors a 30s sprint in a 2h ride, 0.4% of it, to 1% so it stays visible', () => {
    const blocks = buildWorkoutProfile(
      SPRINT_IN_A_LONG_RIDE,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks[1].widthFraction).toBe(0.01);
  });

  it('buildWorkoutProfile takes the floored width off the longer steps, keeping the total whole', () => {
    const blocks = buildWorkoutProfile(
      SPRINT_IN_A_LONG_RIDE,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks[0].widthFraction).toBeCloseTo(0.4971, 4);
    expect(blocks[2].widthFraction).toBeCloseTo(0.4929, 4);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile keeps every burst of a microburst session visible, though each is under the floor on its own', () => {
    const thirtyByTenSecondsOnFiftyOff = Array.from({ length: 30 }, () => [
      { duration: 10, power: { units: 'power_zone', value: 6 } },
      { duration: 50, power: { units: 'power_zone', value: 2 } },
    ]).flat();
    const blocks = buildWorkoutProfile(
      thirtyByTenSecondsOnFiftyOff,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toHaveLength(60);
    expect(blocks.every(block => block.widthFraction >= 0.01)).toBe(true);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile drops the floor when there are too many steps to fit it, keeping the shape honest', () => {
    const steps = [
      ...Array.from({ length: 149 }, () => ({
        duration: 15,
        power: { units: 'power_zone', value: 6 },
      })),
      { duration: 3600, power: { units: 'power_zone', value: 2 } },
    ];
    const blocks = buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS);

    expect(blocks[149].widthFraction).toBeCloseTo(0.617, 3);
    expect(
      blocks.reduce((sum, block) => sum + block.widthFraction, 0),
    ).toBeCloseTo(1, 10);
  });

  it('buildWorkoutProfile draws each rep of a nested repeat as its own blocks, in order, from a parent that carries the total and children that carry one rep', () => {
    const sixByThreeMinutesOnTwoOff = [
      { duration: 600, power: { units: 'power_zone', value: 1 } },
      {
        text: '6x',
        reps: 6,
        duration: 1800,
        steps: [
          { duration: 180, power: { units: '%ftp', value: 110 } },
          { duration: 120, power: { units: '%ftp', value: 50 } },
        ],
      },
      { duration: 600, power: { units: 'power_zone', value: 1 } },
    ];
    const on = { widthFraction: 0.06, minPct: 110, maxPct: 110, zone: 5 };
    const off = { widthFraction: 0.04, minPct: 50, maxPct: 50, zone: 1 };
    const easy = { widthFraction: 0.2, minPct: 0, maxPct: 55, zone: 1 };

    const blocks = buildWorkoutProfile(
      sixByThreeMinutesOnTwoOff,
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(blocks).toHaveLength(14);
    blocks.forEach((block, index) => {
      const expected =
        index === 0 || index === 13 ? easy : index % 2 === 1 ? on : off;

      expect(block).toEqual({
        ...expected,
        widthFraction: expect.closeTo(expected.widthFraction, 10),
      });
    });
  });

  it('buildWorkoutProfile unrolls repeats nested inside repeats', () => {
    const twoByThreeBurstsThenFiveMinutesEasy = [
      {
        reps: 2,
        duration: 960,
        steps: [
          {
            reps: 3,
            duration: 180,
            steps: [
              { duration: 30, power: { units: 'power_zone', value: 6 } },
              { duration: 30, power: { units: 'power_zone', value: 2 } },
            ],
          },
          { duration: 300, power: { units: 'power_zone', value: 1 } },
        ],
      },
    ];

    const zones = buildWorkoutProfile(
      twoByThreeBurstsThenFiveMinutesEasy,
      SPELLED_OUT_COGGAN_BANDS,
    ).map(block => block.zone);

    expect(zones).toEqual([6, 2, 6, 2, 6, 2, 1, 6, 2, 6, 2, 6, 2, 1]);
  });

  it('buildWorkoutProfile does not count a repeat total on top of its reps when judging what is drawable', () => {
    const steps = [
      {
        reps: 2,
        duration: 1200,
        steps: [{ duration: 600, power: { units: 'power_zone', value: 4 } }],
      },
      { duration: 1000, freeride: true },
    ];

    expect(buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS)).toEqual([
      { widthFraction: 0.5, minPct: 90, maxPct: 105, zone: 4 },
      { widthFraction: 0.5, minPct: 90, maxPct: 105, zone: 4 },
    ]);
  });

  it('profileCeilingPct is the workout own maximum power, so its tallest block fills the height', () => {
    const blocks = buildWorkoutProfile(
      THRESHOLD_2X20,
      SPELLED_OUT_COGGAN_BANDS,
    );
    const ceiling = profileCeilingPct(blocks);

    expect(ceiling).toBe(105);
    expect(Math.max(...blocks.map(block => block.maxPct / ceiling))).toBe(1);
  });

  it('profileCeilingPct scales an easy ride against its own ceiling, not a shared one', () => {
    const easyRide = buildWorkoutProfile(
      [{ duration: 5400, power: { units: '%ftp', start: 60, end: 70 } }],
      SPELLED_OUT_COGGAN_BANDS,
    );

    expect(profileCeilingPct(easyRide)).toBe(70);
  });

  it('profileCeilingPct is zero for an empty profile', () => {
    expect(profileCeilingPct([])).toBe(0);
  });
});

describe('hasWorkoutProfile', () => {
  const byHeartRate = (duration: number): WorkoutStep => ({
    duration,
    hr: { units: '%hr', value: 75 },
  });
  const atFtpPct = (duration: number, value: number): WorkoutStep => ({
    duration,
    power: { units: '%ftp', value },
  });

  it.each<[boolean, string, WorkoutStep[]]>([
    [
      true,
      'power over exactly half the time',
      [atFtpPct(1800, 70), byHeartRate(1800)],
    ],
    [
      false,
      'power over less than half the time',
      [atFtpPct(1799, 70), byHeartRate(1801)],
    ],
    [
      true,
      'a Repeat counted once per rep, not on top of its reps',
      [
        { reps: 2, duration: 1200, steps: [atFtpPct(600, 90)] },
        byHeartRate(1000),
      ],
    ],
    [
      false,
      'no step asking for any power',
      [atFtpPct(1800, 0), atFtpPct(1800, 0)],
    ],
    [false, 'no steps', []],
    [
      false,
      'steps with only a distance',
      [{ distance: 5000, power: { units: '%ftp', value: 70 } }],
    ],
  ])('is %p with %s', (expected, _, steps) => {
    expect(
      hasWorkoutProfile(stepsAtTheirTime(steps, SPELLED_OUT_COGGAN_BANDS)),
    ).toBe(expected);
  });

  it('is true exactly when the Workout Tile draws blocks', () => {
    const workouts: WorkoutStep[][] = [
      THRESHOLD_2X20,
      SPRINT_IN_A_LONG_RIDE,
      [atFtpPct(1200, 70), byHeartRate(2400)],
      [atFtpPct(600, 0)],
      [],
    ];

    expect(
      workouts.map(steps =>
        hasWorkoutProfile(stepsAtTheirTime(steps, SPELLED_OUT_COGGAN_BANDS)),
      ),
    ).toEqual(
      workouts.map(
        steps =>
          buildWorkoutProfile(steps, SPELLED_OUT_COGGAN_BANDS).length > 0,
      ),
    );
  });
});
