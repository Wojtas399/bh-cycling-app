import type { StripSegment } from '../detailedProfile';
import { type Zone, resolveZoneConfig } from '../powerZones';
import {
  type ZoneTimes,
  planZoneTimes,
  timeInZoneRows,
  zoneTimesFromIcu,
  zoneTimesOfSegments,
} from '../timeInZone';
import type { WorkoutStep } from '../workoutProfile';

function segment(start: number, end: number, zone: Zone): StripSegment {
  return {
    start,
    end,
    minPct: 0,
    maxPct: 0,
    minWatts: null,
    maxWatts: null,
    low: 0,
    high: 0,
    zone,
  };
}

describe('zoneTimesOfSegments', () => {
  it('adds up the time each zone is drawn, in s', () => {
    expect(
      zoneTimesOfSegments([
        segment(0, 600, 2),
        segment(600, 900, 4),
        segment(900, 1200, 2),
        segment(1200, 1230, 7),
      ]),
    ).toEqual({ 1: 0, 2: 900, 3: 0, 4: 300, 5: 0, 6: 0, 7: 30 });
  });

  it("leaves out time the strip doesn't draw, such as a stop", () => {
    expect(
      zoneTimesOfSegments([segment(0, 300, 3), segment(500, 800, 3)]),
    ).toEqual({ 1: 0, 2: 0, 3: 600, 4: 0, 5: 0, 6: 0, 7: 0 });
  });
});

describe('zoneTimesFromIcu', () => {
  it("reads intervals.icu's seconds for Z1–Z7 and ignores Sweet Spot", () => {
    expect(
      zoneTimesFromIcu([
        { id: 'Z1', secs: 420 },
        { id: 'Z2', secs: 2410 },
        { id: 'Z3', secs: 610 },
        { id: 'Z4', secs: 305 },
        { id: 'Z5', secs: 0 },
        { id: 'Z6', secs: 14 },
        { id: 'Z7', secs: 3 },
        { id: 'SS', secs: 820 },
      ]),
    ).toEqual({ 1: 420, 2: 2410, 3: 610, 4: 305, 5: 0, 6: 14, 7: 3 });
  });

  it('counts a zone missing from the list as no time', () => {
    expect(zoneTimesFromIcu([{ id: 'Z3', secs: 1200 }])).toEqual({
      1: 0,
      2: 0,
      3: 1200,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    });
  });

  it('skips entries it cannot read', () => {
    expect(
      zoneTimesFromIcu([
        { id: 'Z2', secs: 600 },
        { id: 'Z8', secs: 60 },
        { id: 'Z4', secs: Number.NaN },
        { id: 'Z5', secs: -30 },
        { id: 'z3', secs: 90 },
      ]),
    ).toEqual({ 1: 0, 2: 600, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('is null without any time in Z1–Z7, so the strip is counted instead', () => {
    expect(zoneTimesFromIcu(undefined)).toBeNull();
    expect(zoneTimesFromIcu(null)).toBeNull();
    expect(zoneTimesFromIcu([])).toBeNull();
    expect(
      zoneTimesFromIcu([
        { id: 'Z2', secs: 0 },
        { id: 'SS', secs: 300 },
      ]),
    ).toBeNull();
  });
});

/** Coggan zones: edges at 55, 75, 90, 105, 120 and 150% FTP. */
const COGGAN = resolveZoneConfig(null);

function ftpStep(duration: number, pct: number): WorkoutStep {
  return { duration, power: { units: '%ftp', value: pct } };
}

describe('planZoneTimes', () => {
  it("puts each step's time in the zone of its power", () => {
    expect(
      planZoneTimes(
        [ftpStep(600, 50), ftpStep(1200, 88), ftpStep(300, 100)],
        COGGAN,
      ),
    ).toEqual({ 1: 600, 2: 0, 3: 1200, 4: 300, 5: 0, 6: 0, 7: 0 });
  });

  it('reads the zones at the zone config it is given', () => {
    // 58% is Z2 on Coggan's zones but Z1 under a 60% ceiling.
    const config = resolveZoneConfig({
      powerZones: [60, 80, 95, 110, 125, 160, 999],
    });

    expect(planZoneTimes([ftpStep(600, 58)], COGGAN)[2]).toBe(600);
    expect(planZoneTimes([ftpStep(600, 58)], config)[1]).toBe(600);
  });

  it('puts a power zone target in that zone', () => {
    expect(
      planZoneTimes(
        [{ duration: 900, power: { units: 'power_zone', value: 2 } }],
        COGGAN,
      ),
    ).toEqual({ 1: 0, 2: 900, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('counts every rep of a repeat once, and not the repeat itself', () => {
    expect(
      planZoneTimes(
        [
          ftpStep(600, 50),
          {
            text: '3x',
            reps: 3,
            duration: 540,
            steps: [ftpStep(120, 115), ftpStep(60, 50)],
          },
        ],
        COGGAN,
      ),
    ).toEqual({ 1: 780, 2: 0, 3: 0, 4: 0, 5: 360, 6: 0, 7: 0 });
  });

  it('counts a range at its middle, as the strip colours it', () => {
    expect(
      planZoneTimes(
        [{ duration: 600, power: { units: '%ftp', start: 84, end: 96 } }],
        COGGAN,
      )[3],
    ).toBe(600);
  });

  it('splits a ramp between the zones it climbs through, in proportion', () => {
    // 45→75% spends a third of its span below the 55% edge.
    expect(
      planZoneTimes(
        [
          {
            duration: 600,
            ramp: true,
            power: { units: '%ftp', start: 45, end: 75 },
          },
        ],
        COGGAN,
      ),
    ).toEqual({ 1: 200, 2: 400, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('splits a ramp down the same way', () => {
    expect(
      planZoneTimes(
        [
          {
            duration: 600,
            ramp: true,
            power: { units: '%ftp', start: 75, end: 45 },
          },
        ],
        COGGAN,
      ),
    ).toEqual({ 1: 200, 2: 400, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('keeps a ramp past the top zone in the top zone', () => {
    // 140→240%: 10 points in Z6, the other 90 above Z7's 150% floor.
    expect(
      planZoneTimes(
        [
          {
            duration: 100,
            ramp: true,
            power: { units: '%ftp', start: 140, end: 240 },
          },
        ],
        COGGAN,
      ),
    ).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 10, 7: 90 });
  });

  it('leaves out steps with no power or no length to count', () => {
    expect(
      planZoneTimes(
        [
          ftpStep(600, 70),
          { duration: 300, freeride: true },
          { duration: 300, hr: { units: '%hr', value: 80 } },
          { duration: 300, power: { units: 'w', value: 250 } },
          { power: { units: '%ftp', value: 100 } },
        ],
        COGGAN,
      ),
    ).toEqual({ 1: 0, 2: 600, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('is all zeros with no steps', () => {
    expect(planZoneTimes(undefined, COGGAN)).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    });
  });
});

function times(seconds: Partial<Record<Zone, number>>): ZoneTimes {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, ...seconds };
}

describe('timeInZoneRows', () => {
  it('has a row for each zone with time in the plan or the ride, plan beside ride', () => {
    expect(
      timeInZoneRows(
        times({ 1: 600, 2: 1800, 4: 1200 }),
        times({ 1: 900, 2: 2400, 3: 300, 4: 600 }),
      ),
    ).toEqual([
      {
        zone: 1,
        planned: { seconds: 600, share: 0.25 },
        recorded: { seconds: 900, share: 0.375 },
      },
      {
        zone: 2,
        planned: { seconds: 1800, share: 0.75 },
        recorded: { seconds: 2400, share: 1 },
      },
      {
        zone: 3,
        planned: { seconds: 0, share: 0 },
        recorded: { seconds: 300, share: 0.125 },
      },
      {
        zone: 4,
        planned: { seconds: 1200, share: 0.5 },
        recorded: { seconds: 600, share: 0.25 },
      },
    ]);
  });

  it('measures the bars against the longest time on either side', () => {
    const rows = timeInZoneRows(times({ 2: 3000 }), times({ 2: 1500 }));

    expect(rows[0].planned?.share).toBe(1);
    expect(rows[0].recorded?.share).toBe(0.5);
  });

  it('leaves the side a card has no strip for empty', () => {
    expect(timeInZoneRows(times({ 3: 1200, 5: 300 }), null)).toEqual([
      { zone: 3, planned: { seconds: 1200, share: 1 }, recorded: null },
      { zone: 5, planned: { seconds: 300, share: 0.25 }, recorded: null },
    ]);
    expect(timeInZoneRows(null, times({ 2: 600 }))).toEqual([
      { zone: 2, planned: null, recorded: { seconds: 600, share: 1 } },
    ]);
  });

  it('rounds to whole seconds, dropping a zone left with none', () => {
    expect(timeInZoneRows(null, times({ 2: 599.6, 6: 0.4 }))).toEqual([
      { zone: 2, planned: null, recorded: { seconds: 600, share: 1 } },
    ]);
  });

  it('has no rows with no time in any zone', () => {
    expect(timeInZoneRows(times({}), times({}))).toEqual([]);
    expect(timeInZoneRows(null, null)).toEqual([]);
  });
});
