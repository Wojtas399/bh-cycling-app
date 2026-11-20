import type {
  DetailedProfile,
  DetailedStrip,
  ScaleUnit,
} from '../detailedProfile';
import type { Zone } from '../powerZones';
import { pointerSeconds, profileReadout, segmentAt } from '../profileReadout';
import type { StripSegment } from '../stripSegment';
import { NO_ZONE_TIMES } from '../timeInZone';

function flatAt250WFtpOnWattsScale(
  start: number,
  end: number,
  pct: number,
  zone: Zone,
) {
  const watts = (pct * 250) / 100;

  return {
    start,
    end,
    minPct: pct,
    maxPct: pct,
    minWatts: watts,
    maxWatts: watts,
    low: watts,
    high: watts,
    zone,
  } satisfies StripSegment;
}

describe('segmentAt', () => {
  const warmup = flatAt250WFtpOnWattsScale(0, 600, 60, 2);
  const effort = flatAt250WFtpOnWattsScale(600, 900, 100, 4);
  const homeAfterAStopFrom900To960 = flatAt250WFtpOnWattsScale(
    960,
    1200,
    50,
    1,
  );
  const segments = [warmup, effort, homeAfterAStopFrom900To960];

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

  it('snaps to the detected interval when the strip falls back to long blocks', () => {
    const blocks = [
      flatAt250WFtpOnWattsScale(0, 1800, 65, 2),
      flatAt250WFtpOnWattsScale(1800, 3600, 95, 4),
    ];

    expect(segmentAt(blocks, 1799)).toBe(blocks[0]);
    expect(segmentAt(blocks, 2500)).toBe(blocks[1]);
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

function stripWithNumbersTheReadoutLeavesUnread(
  segments: StripSegment[],
): DetailedStrip<null> {
  return {
    summary: null,
    ftp: 250,
    segments,
    power: { unit: 'watts', peak: 0, peakFtpPct: 0, average: 0 },
    zoneTimes: NO_ZONE_TIMES,
  };
}

function card(
  unit: ScaleUnit,
  planned: StripSegment[] | null,
  recorded: StripSegment[] | null,
): Pick<DetailedProfile, 'scale' | 'planned' | 'recorded'> {
  return {
    scale: { unit, ceiling: 400, gridlines: [] },
    planned: planned && {
      ...stripWithNumbersTheReadoutLeavesUnread(planned),
      summary: PLAN_SUMMARY,
    },
    recorded: recorded && {
      ...stripWithNumbersTheReadoutLeavesUnread(recorded),
      summary: RIDE_SUMMARY,
    },
  };
}

const PLAN_SUMMARY = { durationSeconds: 3600, stepCount: 3, peakFtpPct: 93 };
const RIDE_SUMMARY = {
  durationSeconds: 3600,
  segmentCount: 3,
  peakFtpPct: 100,
};

const sweetSpotFrom88To93PctAt250WFtp = {
  ...flatAt250WFtpOnWattsScale(600, 2400, 88, 3),
  maxPct: 93,
  maxWatts: 232.5,
  high: 232.5,
} satisfies StripSegment;

const rampUpFrom50To100PctOverFirst600Seconds = {
  ...flatAt250WFtpOnWattsScale(0, 600, 50, 2),
  maxPct: 100,
  maxWatts: 250,
  high: 250,
  ramp: {
    startPct: 50,
    endPct: 100,
    startWatts: 125,
    endWatts: 250,
    startOnScale: 125,
    endOnScale: 250,
  },
} satisfies StripSegment;

const rampDownFrom100To50PctOver600To1200Seconds = {
  ...rampUpFrom50To100PctOverFirst600Seconds,
  start: 600,
  end: 1200,
  ramp: {
    startPct: 100,
    endPct: 50,
    startWatts: 250,
    endWatts: 125,
    startOnScale: 250,
    endOnScale: 125,
  },
} satisfies StripSegment;

describe('profileReadout', () => {
  it('reads each strip at the pointer: its zone, then %FTP and W', () => {
    const readout = profileReadout(
      card(
        'watts',
        [sweetSpotFrom88To93PctAt250WFtp],
        [flatAt250WFtpOnWattsScale(0, 3600, 100, 4)],
      ),
      1200,
    );

    expect(readout.strips).toEqual([
      { side: 'planned', reading: { zone: 3, power: '88–93% · 220–233 W' } },
      { side: 'recorded', reading: { zone: 4, power: '100% · 250 W' } },
    ]);
  });

  it('reads only the strips the card has', () => {
    const readout = profileReadout(
      card('watts', null, [flatAt250WFtpOnWattsScale(0, 3600, 100, 4)]),
      1200,
    );

    expect(readout.strips.map(({ side }) => side)).toEqual(['recorded']);
  });

  it('leaves W out on a %FTP card, even for a strip that has an FTP', () => {
    const readout = profileReadout(
      card(
        'ftpPct',
        [sweetSpotFrom88To93PctAt250WFtp],
        [flatAt250WFtpOnWattsScale(0, 3600, 100, 4)],
      ),
      1200,
    );

    expect(readout.strips.map(({ reading }) => reading?.power)).toEqual([
      '88–93%',
      '100%',
    ]);
  });

  it('reads nothing for a strip with no data at the pointer, and still reads the other', () => {
    const planEndingAt2400 = [sweetSpotFrom88To93PctAt250WFtp];
    const rideStoppingFrom3000To3300 = [
      flatAt250WFtpOnWattsScale(0, 3000, 100, 4),
      flatAt250WFtpOnWattsScale(3300, 3600, 60, 2),
    ];
    const profile = card('watts', planEndingAt2400, rideStoppingFrom3000To3300);

    expect(profileReadout(profile, 2500).strips).toEqual([
      { side: 'planned', reading: null },
      { side: 'recorded', reading: { zone: 4, power: '100% · 250 W' } },
    ]);
    expect(profileReadout(profile, 3100).strips).toEqual([
      { side: 'planned', reading: null },
      { side: 'recorded', reading: null },
    ]);
  });

  it('rounds to whole %FTP and W, and reads a range that rounds to one value as one', () => {
    const almostFlat = {
      ...flatAt250WFtpOnWattsScale(0, 3600, 99.8, 4),
      maxPct: 100.2,
      minWatts: 249.6,
      maxWatts: 250.4,
    } satisfies StripSegment;
    const readout = profileReadout(card('watts', null, [almostFlat]), 1200);

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
        card('watts', [rampUpFrom50To100PctOverFirst600Seconds], null),
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
        card('watts', [rampDownFrom100To50PctOver600To1200Seconds], null),
        seconds,
      );

      expect(readout.strips[0].reading).toEqual({ zone: 2, power });
    },
  );

  it('reads a ramp in %FTP alone on a %FTP card', () => {
    const readout = profileReadout(
      card('ftpPct', [rampDownFrom100To50PctOver600To1200Seconds], null),
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
      profileReadout(
        card('watts', null, [flatAt250WFtpOnWattsScale(0, 3600, 100, 4)]),
        seconds,
      ).time,
    ).toBe(time);
  });
});
