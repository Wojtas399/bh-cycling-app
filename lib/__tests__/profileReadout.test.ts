import type { Zone } from '../powerZones';
import {
  type ProfileCard,
  type RecordedProfile,
  type StripSegment,
  buildProfileCard,
} from '../profileCard';
import { pointerSeconds, profileReadout, segmentAt } from '../profileReadout';
import { type RideSettings, resolveRideSettings } from '../rideSettings';
import { NO_ZONE_TIMES } from '../timeInZone';
import type { WorkoutBlock } from '../workoutProfile';

const AT_250_W_FTP = resolveRideSettings({ ftp: 250 });

const WITHOUT_A_CURRENT_FTP = resolveRideSettings(null);

type IntervalRow = [
  startSeconds: number,
  endSeconds: number,
  intensity: number,
  zone: Zone,
];

function ride(rows: IntervalRow[], endSeconds: number): RecordedProfile {
  return {
    intervals: rows.map(([startSeconds, end, intensity, zone]) => ({
      startSeconds,
      endSeconds: end,
      intensity,
      zone,
    })),
    endSeconds,
    icuFtp: 250,
    icuZoneTimes: null,
  };
}

function plan(blocks: WorkoutBlock[], durationSeconds: number) {
  return {
    blocks,
    summary: { durationSeconds, stepCount: blocks.length, peakFtpPct: 0 },
    zoneTimes: NO_ZONE_TIMES,
  };
}

function cardOf(
  input: Parameters<typeof buildProfileCard>[0],
  settings: RideSettings = AT_250_W_FTP,
): ProfileCard {
  const card = buildProfileCard(input, settings);

  if (!card) throw new Error('No card to read.');

  return card;
}

function rideSegments(rows: IntervalRow[], endSeconds: number): StripSegment[] {
  return cardOf({ recorded: ride(rows, endSeconds) }).recorded?.segments ?? [];
}

describe('segmentAt', () => {
  const segments = rideSegments(
    [
      [0, 600, 60, 2],
      [600, 900, 100, 4],
      [960, 1200, 50, 1],
    ],
    1200,
  );
  const [warmup, effort, homeAfterAStopFrom900To960] = segments;

  it('finds the segment the time falls in', () => {
    expect(segmentAt(segments, 300)).toBe(warmup);
    expect(segmentAt(segments, 700)).toBe(effort);
    expect(segmentAt(segments, 1000)).toBe(homeAfterAStopFrom900To960);
  });

  it('finds nothing in a stop, which the strip leaves as a gap', () => {
    expect(segmentAt(segments, 930)).toBeNull();
  });

  it('finds nothing past the end of a strip shorter than the card', () => {
    expect(segmentAt(segments, 1500)).toBeNull();
  });

  it('finds nothing in a strip that draws nothing', () => {
    expect(segmentAt([], 0)).toBeNull();
  });

  it('gives the later segment where two meet', () => {
    expect(segmentAt(segments, 600)).toBe(effort);
  });

  it('includes each end of the strip, so the pointer at either edge reads it', () => {
    expect(segmentAt(segments, 0)).toBe(warmup);
    expect(segmentAt(segments, 1200)).toBe(homeAfterAStopFrom900To960);
  });

  it('includes the end of a segment that a stop follows', () => {
    expect(segmentAt(segments, 900)).toBe(effort);
  });

  it('snaps to the detected interval in a ride of long intervals', () => {
    const long = rideSegments(
      [
        [0, 1800, 65, 2],
        [1800, 3600, 95, 4],
      ],
      3600,
    );

    expect(segmentAt(long, 1799)).toBe(long[0]);
    expect(segmentAt(long, 2500)).toBe(long[1]);
  });
});

describe('pointerSeconds', () => {
  it("places the pointer on the card's time scale by its share of the plot", () => {
    expect(pointerSeconds(75, 300, 3600)).toBe(900);
  });

  it('keeps a finger dragged off either side of the plot at its edge', () => {
    expect(pointerSeconds(-20, 300, 3600)).toBe(0);
    expect(pointerSeconds(340, 300, 3600)).toBe(3600);
  });

  it('reads the start on a plot with no width yet', () => {
    expect(pointerSeconds(10, 0, 3600)).toBe(0);
  });
});

const GAP = { minPct: 0, maxPct: 0, zone: 1 } as const;

const SWEET_SPOT_FROM_88_TO_93_PCT_OVER_600_TO_2400_SECONDS = plan(
  [
    { widthFraction: 0.25, ...GAP },
    { widthFraction: 0.75, minPct: 88, maxPct: 93, zone: 3 },
  ],
  2400,
);

const RIDE_AT_100_PCT_FOR_AN_HOUR = ride([[0, 3600, 100, 4]], 3600);

const RAMP_UP_FROM_50_TO_100_PCT_OVER_THE_FIRST_600_SECONDS = plan(
  [
    {
      widthFraction: 1,
      minPct: 50,
      maxPct: 100,
      zone: 2,
      ramp: { startPct: 50, endPct: 100 },
    },
  ],
  600,
);

const RAMP_DOWN_FROM_100_TO_50_PCT_OVER_600_TO_1200_SECONDS = plan(
  [
    { widthFraction: 0.5, ...GAP },
    {
      widthFraction: 0.5,
      minPct: 50,
      maxPct: 100,
      zone: 2,
      ramp: { startPct: 100, endPct: 50 },
    },
  ],
  1200,
);

describe('profileReadout', () => {
  it('reads each strip at the pointer: its zone, then %FTP and W', () => {
    const readout = profileReadout(
      cardOf({
        planned: SWEET_SPOT_FROM_88_TO_93_PCT_OVER_600_TO_2400_SECONDS,
        recorded: RIDE_AT_100_PCT_FOR_AN_HOUR,
      }),
      1200,
    );

    expect(readout.strips).toEqual([
      { side: 'planned', reading: { zone: 3, power: '88–93% · 220–233 W' } },
      { side: 'recorded', reading: { zone: 4, power: '100% · 250 W' } },
    ]);
  });

  it('reads only the strips the card has', () => {
    const readout = profileReadout(
      cardOf({ recorded: RIDE_AT_100_PCT_FOR_AN_HOUR }),
      1200,
    );

    expect(readout.strips.map(({ side }) => side)).toEqual(['recorded']);
  });

  it('leaves W out on a %FTP card, even for a ride that kept its own FTP', () => {
    const readout = profileReadout(
      cardOf(
        {
          planned: SWEET_SPOT_FROM_88_TO_93_PCT_OVER_600_TO_2400_SECONDS,
          recorded: RIDE_AT_100_PCT_FOR_AN_HOUR,
        },
        WITHOUT_A_CURRENT_FTP,
      ),
      1200,
    );

    expect(readout.strips.map(({ reading }) => reading?.power)).toEqual([
      '88–93%',
      '100%',
    ]);
  });

  it('reads nothing for a strip with no data at the pointer, and still reads the other', () => {
    const card = cardOf({
      planned: SWEET_SPOT_FROM_88_TO_93_PCT_OVER_600_TO_2400_SECONDS,
      recorded: ride(
        [
          [0, 3000, 100, 4],
          [3300, 3600, 60, 2],
        ],
        3600,
      ),
    });

    expect(profileReadout(card, 2500).strips).toEqual([
      { side: 'planned', reading: null },
      { side: 'recorded', reading: { zone: 4, power: '100% · 250 W' } },
    ]);
    expect(profileReadout(card, 3100).strips).toEqual([
      { side: 'planned', reading: null },
      { side: 'recorded', reading: null },
    ]);
  });

  it('rounds to whole %FTP and W, and reads a range that rounds to one value as one', () => {
    const almostFlat = plan(
      [{ widthFraction: 1, minPct: 99.9, maxPct: 100.1, zone: 4 }],
      3600,
    );
    const readout = profileReadout(cardOf({ planned: almostFlat }), 1200);

    expect(readout.strips[0].reading?.power).toBe('100% · 250 W');
  });

  it.each([
    [0, '50% · 125 W'],
    [300, '75% · 188 W'],
    [600, '100% · 250 W'],
  ])(
    'reads a ramp up at %p s as one value along its slope: %p',
    (seconds, power) => {
      const readout = profileReadout(
        cardOf({
          planned: RAMP_UP_FROM_50_TO_100_PCT_OVER_THE_FIRST_600_SECONDS,
        }),
        seconds,
      );

      expect(readout.strips[0].reading).toEqual({ zone: 2, power });
    },
  );

  it.each([
    [600, '100% · 250 W'],
    [900, '75% · 188 W'],
    [1200, '50% · 125 W'],
  ])(
    'reads a ramp down at %p s as one value along its slope: %p',
    (seconds, power) => {
      const readout = profileReadout(
        cardOf({
          planned: RAMP_DOWN_FROM_100_TO_50_PCT_OVER_600_TO_1200_SECONDS,
        }),
        seconds,
      );

      expect(readout.strips[0].reading).toEqual({ zone: 2, power });
    },
  );

  it('reads a ramp in %FTP alone on a %FTP card', () => {
    const readout = profileReadout(
      cardOf(
        { planned: RAMP_DOWN_FROM_100_TO_50_PCT_OVER_600_TO_1200_SECONDS },
        WITHOUT_A_CURRENT_FTP,
      ),
      900,
    );

    expect(readout.strips[0].reading?.power).toBe('75%');
  });

  it.each([
    [0, '0:00'],
    [754, '12:34'],
    [754.9, '12:34'],
    [3725, '1:02:05'],
  ])('shows the pointer at %p s as %p', (seconds, time) => {
    expect(
      profileReadout(cardOf({ recorded: RIDE_AT_100_PCT_FOR_AN_HOUR }), seconds)
        .time,
    ).toBe(time);
  });
});
