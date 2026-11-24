import type { Zone } from '../powerZones';
import {
  type PlannedProfile,
  type RecordedProfile,
  axisLabels,
  buildProfileCard,
} from '../profileCard';
import { type RideSettings, resolveRideSettings } from '../rideSettings';
import type { ZoneTimes } from '../timeInZone';
import type { WorkoutBlock } from '../workoutProfile';

const COGGAN_AT_250_W: RideSettings = resolveRideSettings({ ftp: 250 });

const COGGAN_WITHOUT_FTP: RideSettings = resolveRideSettings(null);

const NO_ZONE_TIMES: ZoneTimes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

const GAP = { minPct: 0, maxPct: 0, zone: 1 } as const;

function plan(
  blocks: WorkoutBlock[],
  durationSeconds = 3600,
  zoneTimes: ZoneTimes = NO_ZONE_TIMES,
): PlannedProfile {
  return {
    blocks,
    summary: { durationSeconds, stepCount: blocks.length, peakFtpPct: 0 },
    zoneTimes,
  };
}

type IntervalRow = [
  startSeconds: number,
  endSeconds: number,
  intensity: number,
  zone: Zone,
];

function ride(
  rows: IntervalRow[],
  endSeconds: number,
  {
    icuFtp = null,
    icuZoneTimes = null,
  }: Partial<Pick<RecordedProfile, 'icuFtp' | 'icuZoneTimes'>> = {},
): RecordedProfile {
  return {
    intervals: rows.map(([startSeconds, end, intensity, zone]) => ({
      startSeconds,
      endSeconds: end,
      intensity,
      zone,
    })),
    endSeconds,
    icuFtp,
    icuZoneTimes,
  };
}

const PLAN_TO_110: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
  { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
];

describe('buildProfileCard', () => {
  describe('recorded strip', () => {
    it("places each interval at its own seconds, in %FTP and watts at the ride's FTP, and leaves the gaps between them empty", () => {
      const card = buildProfileCard(
        {
          recorded: ride(
            [
              [0, 900, 55, 2],
              [1800, 2700, 98, 4],
            ],
            3600,
            { icuFtp: 240 },
          ),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(3600);
      expect(card?.recorded?.segments).toEqual([
        {
          startSeconds: 0,
          endSeconds: 900,
          minPct: 55,
          maxPct: 55,
          minWatts: 132,
          maxWatts: 132,
          lowOnScale: 132,
          highOnScale: 132,
          zone: 2,
        },
        {
          startSeconds: 1800,
          endSeconds: 2700,
          minPct: 98,
          maxPct: 98,
          minWatts: 235.2,
          maxWatts: 235.2,
          lowOnScale: 235.2,
          highOnScale: 235.2,
          zone: 4,
        },
      ]);
    });

    it('sums up its span, segment count and rounded peak', () => {
      const card = buildProfileCard(
        {
          recorded: ride(
            [
              [0, 1200, 64.2, 2],
              [1200, 1500, 178.6, 7],
              [1500, 9300, 71, 2],
            ],
            9300,
          ),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.recorded?.summary).toEqual({
        durationSeconds: 9300,
        segmentCount: 3,
        peakFtpPct: 179,
      });
    });

    it('keeps a trailing gap up to the end of the span', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 1800, 88, 3]], 3600) },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(3600);
      expect(
        card?.recorded?.segments.map(({ endSeconds }) => endSeconds),
      ).toEqual([1800]);
    });

    it('has no strip for a ride without power intervals', () => {
      expect(
        buildProfileCard({ recorded: ride([], 3600) }, COGGAN_AT_250_W),
      ).toBeNull();
    });
  });

  describe('planned strip', () => {
    it("places the Tile's blocks across the plan's duration, as today", () => {
      const card = buildProfileCard(
        { planned: plan(PLAN_TO_110, 3600) },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(3600);
      expect(card?.planned?.segments).toEqual([
        {
          startSeconds: 0,
          endSeconds: 1800,
          minPct: 60,
          maxPct: 60,
          minWatts: 150,
          maxWatts: 150,
          lowOnScale: 150,
          highOnScale: 150,
          zone: 2,
        },
        {
          startSeconds: 1800,
          endSeconds: 3600,
          minPct: 100,
          maxPct: 110,
          minWatts: 250,
          maxWatts: 275,
          lowOnScale: 250,
          highOnScale: 275,
          zone: 4,
        },
      ]);
    });

    it('keeps its summary', () => {
      const planned = plan(PLAN_TO_110, 3000);

      expect(
        buildProfileCard({ planned }, COGGAN_AT_250_W)?.planned?.summary,
      ).toEqual(planned.summary);
    });

    it('draws no segment for a block flat on the axis', () => {
      const card = buildProfileCard(
        {
          planned: plan([
            { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
            { widthFraction: 0.5, ...GAP },
          ]),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.planned?.segments).toHaveLength(1);
    });

    it('is dropped beside a ride when the plan has no known duration, as it can’t be placed in time', () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110, 0),
          recorded: ride([[0, 2000, 80, 3]], 2000),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.planned).toBeNull();
      expect(card?.durationSeconds).toBe(2000);
    });

    it('stays alone with no known duration, on an empty span', () => {
      const card = buildProfileCard(
        { planned: plan(PLAN_TO_110, 0) },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(0);
      expect(card?.planned?.segments).toHaveLength(2);
    });

    describe('ramps', () => {
      const RAMP_UP_THEN_DOWN: WorkoutBlock[] = [
        {
          widthFraction: 0.5,
          minPct: 50,
          maxPct: 90,
          zone: 2,
          ramp: { startPct: 50, endPct: 90 },
        },
        {
          widthFraction: 0.5,
          minPct: 40,
          maxPct: 80,
          zone: 2,
          ramp: { startPct: 80, endPct: 40 },
        },
      ];

      it('carry their direction in %FTP, in watts and on a watts scale', () => {
        const card = buildProfileCard(
          { planned: plan(RAMP_UP_THEN_DOWN) },
          resolveRideSettings({ ftp: 200 }),
        );

        expect(card?.planned?.segments.map(({ ramp }) => ramp)).toEqual([
          {
            startPct: 50,
            endPct: 90,
            startWatts: 100,
            endWatts: 180,
            startOnScale: 100,
            endOnScale: 180,
          },
          {
            startPct: 80,
            endPct: 40,
            startWatts: 160,
            endWatts: 80,
            startOnScale: 160,
            endOnScale: 80,
          },
        ]);
      });

      it('carry their direction on a %FTP scale, with no watts without a current FTP', () => {
        const card = buildProfileCard(
          { planned: plan(RAMP_UP_THEN_DOWN) },
          COGGAN_WITHOUT_FTP,
        );

        expect(card?.planned?.segments.map(({ ramp }) => ramp)).toEqual([
          {
            startPct: 50,
            endPct: 90,
            startWatts: null,
            endWatts: null,
            startOnScale: 50,
            endOnScale: 90,
          },
          {
            startPct: 80,
            endPct: 40,
            startWatts: null,
            endWatts: null,
            startOnScale: 80,
            endOnScale: 40,
          },
        ]);
      });

      it("leave a range's segment without a ramp, and the scale and power as a range's", () => {
        const asRanges = RAMP_UP_THEN_DOWN.map(
          ({ ramp: _ramp, ...block }) => block,
        );
        const ramps = buildProfileCard(
          { planned: plan(RAMP_UP_THEN_DOWN) },
          COGGAN_AT_250_W,
        );
        const ranges = buildProfileCard(
          { planned: plan(asRanges) },
          COGGAN_AT_250_W,
        );

        expect(ranges?.planned?.segments.map(({ ramp }) => ramp)).toEqual([
          undefined,
          undefined,
        ]);
        expect(ramps?.scale).toEqual(ranges?.scale);
        expect(ramps?.planned?.power).toEqual({
          unit: 'watts',
          peak: 225,
          peakFtpPct: 90,
          average: 163,
        });
        expect(ramps?.planned?.power).toEqual(ranges?.planned?.power);
      });
    });
  });

  describe('time span', () => {
    it('ends the planned strip early on a ride that ran longer', () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110, 3000),
          recorded: ride([[0, 4000, 80, 3]], 4000),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(4000);
      expect(
        card?.planned?.segments.map(({ startSeconds, endSeconds }) => [
          startSeconds,
          endSeconds,
        ]),
      ).toEqual([
        [0, 1500],
        [1500, 3000],
      ]);
    });

    it('ends the recorded strip early on a ride that was shorter', () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110, 4000),
          recorded: ride([[0, 2000, 80, 3]], 2000),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.durationSeconds).toBe(4000);
      expect(card?.recorded?.segments[0].endSeconds).toBe(2000);
      expect(card?.recorded?.summary.durationSeconds).toBe(2000);
      expect(card?.planned?.summary.durationSeconds).toBe(4000);
    });
  });

  it('is null with nothing to draw', () => {
    expect(buildProfileCard({}, COGGAN_AT_250_W)).toBeNull();
  });

  describe('FTP', () => {
    it('draws the plan at the current FTP and the ride at the FTP intervals.icu used for it', () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110),
          recorded: ride([[0, 3600, 100, 4]], 3600, { icuFtp: 265 }),
        },
        resolveRideSettings({ ftp: 280 }),
      );

      expect(card?.planned?.ftp).toBe(280);
      expect(card?.recorded?.ftp).toBe(265);
      expect(card?.recorded?.segments[0].maxWatts).toBe(265);
    });

    it('draws the ride at the current FTP when intervals.icu kept none for it', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 100, 4]], 3600) },
        resolveRideSettings({ ftp: 280 }),
      );

      expect(card?.recorded?.ftp).toBe(280);
      expect(card?.recorded?.power).toEqual({
        unit: 'watts',
        peak: 280,
        peakFtpPct: 100,
        average: 280,
      });
    });

    it("keeps the card in %FTP with no current FTP, and no strip's power in watts, even for a ride with its own FTP", () => {
      const card = buildProfileCard(
        {
          planned: plan([
            { widthFraction: 1, minPct: 60, maxPct: 60, zone: 2 },
          ]),
          recorded: ride([[0, 3600, 95, 4]], 3600, { icuFtp: 240 }),
        },
        COGGAN_WITHOUT_FTP,
      );

      expect(card?.scale.unit).toBe('ftpPct');
      expect(card?.planned?.power).toEqual({
        unit: 'ftpPct',
        peak: 60,
        peakFtpPct: 60,
        average: 60,
      });
      expect(card?.recorded?.power).toEqual({
        unit: 'ftpPct',
        peak: 95,
        peakFtpPct: 95,
        average: 95,
      });
      expect(card?.recorded?.segments[0]).toMatchObject({
        lowOnScale: 95,
        highOnScale: 95,
      });
    });
  });

  describe('scale', () => {
    it('is in watts, with dashed zone edges at the current FTP up to the first edge above the peak, the 300 W Z5 edge over a 275 W peak', () => {
      const card = buildProfileCard(
        { planned: plan(PLAN_TO_110) },
        COGGAN_AT_250_W,
      );

      expect(card?.scale).toEqual({
        unit: 'watts',
        ceiling: 300,
        gridlines: [138, 188, 225, 263],
      });
    });

    it("is shared by both strips, topped by the higher one's peak: the ride's 312 W, 130% of its own 240 W FTP, past the plan's 275 W", () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110),
          recorded: ride(
            [
              [0, 1800, 70, 2],
              [1800, 3600, 130, 6],
            ],
            3600,
            { icuFtp: 240 },
          ),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.scale).toEqual({
        unit: 'watts',
        ceiling: 375,
        gridlines: [138, 188, 225, 263, 300],
      });
    });

    it('skips past an edge the peak sits on', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 120, 5]], 3600) },
        COGGAN_AT_250_W,
      );

      expect(card?.scale.ceiling).toBe(375);
    });

    it('rounds 5% above the peak up to the next 10 past the last edge', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 248, 7]], 3600) },
        COGGAN_AT_250_W,
      );

      expect(card?.scale.ceiling).toBe(660);
    });

    it('rounds 5% above the peak up to the next 10 when the next edge is more than 1.5× away, as 55% is from a 30% peak', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 30, 1]], 3600) },
        COGGAN_WITHOUT_FTP,
      );

      expect(card?.scale.ceiling).toBe(40);
    });

    it('ignores floating-point noise in the headroom, so a 333⅓% peak tops out at 350, not 360', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, (340 / 102) * 100, 7]], 3600) },
        COGGAN_WITHOUT_FTP,
      );

      expect(card?.scale.ceiling).toBe(350);
    });

    it("draws no line at the top of the last zone, which isn't an edge between zones, so a 210% sprint still sits in Coggan's Z7", () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 210, 7]], 3600) },
        COGGAN_WITHOUT_FTP,
      );

      expect(card?.scale).toEqual({
        unit: 'ftpPct',
        ceiling: 230,
        gridlines: [55, 75, 90, 105, 120, 150],
      });
    });

    it('never collapses to zero, so a ride at 0 W throughout stays drawable', () => {
      const card = buildProfileCard(
        { recorded: ride([[0, 3600, 0, 1]], 3600, { icuFtp: 240 }) },
        COGGAN_AT_250_W,
      );

      expect(card?.recorded?.segments).toEqual([]);
      expect(card?.recorded?.power).toEqual({
        unit: 'watts',
        peak: 0,
        peakFtpPct: 0,
        average: 0,
      });
      expect(card?.scale.ceiling).toBe(10);
    });
  });

  describe('power', () => {
    it("is each strip's peak and time-weighted average watts, rounded, a range read at its middle", () => {
      const card = buildProfileCard(
        { planned: plan(PLAN_TO_110) },
        COGGAN_AT_250_W,
      );

      expect(card?.planned?.power).toEqual({
        unit: 'watts',
        peak: 275,
        peakFtpPct: 110,
        average: 206,
      });
    });

    it('is averaged over the time a strip draws, leaving out its gaps', () => {
      const card = buildProfileCard(
        {
          recorded: ride(
            [
              [0, 900, 55, 2],
              [1800, 2700, 98, 4],
            ],
            3600,
          ),
        },
        COGGAN_WITHOUT_FTP,
      );

      expect(card?.recorded?.power).toEqual({
        unit: 'ftpPct',
        peak: 98,
        peakFtpPct: 98,
        average: 77,
      });
    });
  });

  describe('time in zone', () => {
    const PLAN_ZONE_TIMES: ZoneTimes = {
      1: 0,
      2: 1200,
      3: 0,
      4: 2400,
      5: 0,
      6: 0,
      7: 0,
    };

    const INTERVALS: IntervalRow[] = [
      [0, 900, 60, 2],
      [1800, 3600, 100, 4],
    ];

    it("lists the plan's time from its steps above the ride's from intervals.icu", () => {
      const card = buildProfileCard(
        {
          planned: plan(PLAN_TO_110, 3600, PLAN_ZONE_TIMES),
          recorded: ride(INTERVALS, 3600, {
            icuZoneTimes: { 1: 300, 2: 1500, 3: 0, 4: 1800, 5: 0, 6: 0, 7: 0 },
          }),
        },
        COGGAN_AT_250_W,
      );

      expect(card?.timeInZone).toEqual([
        {
          zone: 1,
          planned: { seconds: 0, share: 0 },
          recorded: { seconds: 300, share: 0.125 },
        },
        {
          zone: 2,
          planned: { seconds: 1200, share: 0.5 },
          recorded: { seconds: 1500, share: 0.625 },
        },
        {
          zone: 4,
          planned: { seconds: 2400, share: 1 },
          recorded: { seconds: 1800, share: 0.75 },
        },
      ]);
    });

    it("counts the ride's time from its intervals when intervals.icu kept none, leaving out the gaps", () => {
      const card = buildProfileCard(
        { recorded: ride(INTERVALS, 3600) },
        COGGAN_AT_250_W,
      );

      expect(card?.recorded?.zoneTimes).toEqual({
        1: 0,
        2: 900,
        3: 0,
        4: 1800,
        5: 0,
        6: 0,
        7: 0,
      });
      expect(card?.timeInZone).toEqual([
        { zone: 2, planned: null, recorded: { seconds: 900, share: 0.5 } },
        { zone: 4, planned: null, recorded: { seconds: 1800, share: 1 } },
      ]);
    });
  });
});

describe('axisLabels', () => {
  it('labels zero, the ceiling and every gridline far enough from its neighbours, dropping 225 W and 300 W, under 12 px from the labels below', () => {
    const plotHeightPx = 100;
    const minSpacingPx = 12;

    expect(
      axisLabels(
        { unit: 'watts', ceiling: 375, gridlines: [138, 188, 225, 263, 300] },
        plotHeightPx,
        minSpacingPx,
      ),
    ).toEqual([0, 138, 188, 263, 375]);
  });
});
