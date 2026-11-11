import type {
  DetailedProfile,
  DetailedStrip,
  ScaleUnit,
  StripSegment,
} from '../detailedProfile';
import type { Zone } from '../powerZones';
import { pointerSeconds, profileReadout, segmentAt } from '../profileReadout';
import { NO_ZONE_TIMES } from '../timeInZone';

/** A flat segment at `pct` %FTP of a 250 W FTP, on the watts scale. */
function flat(start: number, end: number, pct: number, zone: Zone) {
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
  const warmup = flat(0, 600, 60, 2);
  const effort = flat(600, 900, 100, 4);
  // A stop from 900 s to 960 s, then a ride home that ends at 1200 s.
  const home = flat(960, 1200, 50, 1);
  const segments = [warmup, effort, home];

  it('finds the segment the time falls in', () => {
    expect(segmentAt(segments, 300)).toBe(warmup);
    expect(segmentAt(segments, 700)).toBe(effort);
    expect(segmentAt(segments, 1000)).toBe(home);
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
    expect(segmentAt(segments, 1200)).toBe(home);
  });

  it('includes the end of a segment that a stop follows', () => {
    expect(segmentAt(segments, 900)).toBe(effort);
  });

  it('snaps to the detected interval when the strip falls back to blocks', () => {
    // A ride with no stream: two long blocks rather than 2 px buckets.
    const blocks = [flat(0, 1800, 65, 2), flat(1800, 3600, 95, 4)];

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

/** A strip of `segments`, its other numbers unread by the readout. */
function strip(segments: StripSegment[]): DetailedStrip<null> {
  return {
    summary: null,
    ftp: 250,
    segments,
    power: { unit: 'watts', peak: 0, average: 0 },
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
    planned: planned && { ...strip(planned), summary: PLAN_SUMMARY },
    recorded: recorded && { ...strip(recorded), summary: RIDE_SUMMARY },
  };
}

const PLAN_SUMMARY = { durationSeconds: 3600, stepCount: 3, peakFtpPct: 93 };
const RIDE_SUMMARY = {
  startSeconds: 0,
  durationSeconds: 3600,
  segmentCount: 3,
  peakFtpPct: 100,
};

/** A planned range, 88–93% FTP: 220–232.5 W at a 250 W FTP. */
const sweetSpot = {
  ...flat(600, 2400, 88, 3),
  maxPct: 93,
  maxWatts: 232.5,
  high: 232.5,
} satisfies StripSegment;

describe('profileReadout', () => {
  it('reads each strip at the pointer: its zone, then %FTP and W', () => {
    const readout = profileReadout(
      card('watts', [sweetSpot], [flat(0, 3600, 100, 4)]),
      1200,
    );

    expect(readout.strips).toEqual([
      { side: 'planned', reading: { zone: 3, power: '88–93% · 220–233 W' } },
      { side: 'recorded', reading: { zone: 4, power: '100% · 250 W' } },
    ]);
  });

  it('reads only the strips the card has', () => {
    const readout = profileReadout(
      card('watts', null, [flat(0, 3600, 100, 4)]),
      1200,
    );

    expect(readout.strips.map(({ side }) => side)).toEqual(['recorded']);
  });

  it('leaves W out on a %FTP card, even for a strip that has an FTP', () => {
    const readout = profileReadout(
      card('ftpPct', [sweetSpot], [flat(0, 3600, 100, 4)]),
      1200,
    );

    expect(readout.strips.map(({ reading }) => reading?.power)).toEqual([
      '88–93%',
      '100%',
    ]);
  });

  it('reads nothing for a strip with no data at the pointer, and still reads the other', () => {
    // The plan ends at 2400 s; the ride stops from 3000 s to 3300 s.
    const profile = card(
      'watts',
      [sweetSpot],
      [flat(0, 3000, 100, 4), flat(3300, 3600, 60, 2)],
    );

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
      ...flat(0, 3600, 99.8, 4),
      maxPct: 100.2,
      minWatts: 249.6,
      maxWatts: 250.4,
    } satisfies StripSegment;
    const readout = profileReadout(card('watts', null, [almostFlat]), 1200);

    expect(readout.strips[0].reading?.power).toBe('100% · 250 W');
  });

  it.each([
    [0, '0:00'],
    [754, '12:34'],
    [754.9, '12:34'],
    [3725, '1:02:05'],
  ])('shows the pointer at %p s as %p', (seconds, time) => {
    expect(
      profileReadout(card('watts', null, [flat(0, 3600, 100, 4)]), seconds)
        .time,
    ).toBe(time);
  });
});
