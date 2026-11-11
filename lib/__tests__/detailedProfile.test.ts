import {
  axisLabels,
  buildDetailedProfile,
  niceCeiling,
} from '../detailedProfile';
import type { PowerStream } from '../powerStream';
import { resolveZoneConfig } from '../powerZones';
import type { ProfileCard, ProfileStrip, RecordedStrip } from '../profileCard';
import type { ZoneTimes } from '../timeInZone';
import type { WorkoutProfileSummary } from '../workoutDetails';
import type { WorkoutBlock } from '../workoutProfile';

/** Coggan zone edges at a 250 W FTP. */
const EDGES_250 = [137.5, 187.5, 225, 262.5, 300, 375];

describe('niceCeiling', () => {
  it('tops out at the first zone edge above the peak, so the next zone shows as headroom', () => {
    expect(niceCeiling(280, EDGES_250)).toBe(300);
  });

  it('skips past an edge the peak sits on', () => {
    expect(niceCeiling(300, EDGES_250)).toBe(375);
  });

  it('rounds 5% above the peak up to the next 10 when the next edge is more than 1.5× away', () => {
    // A 100 W ride under a 137.5 W edge fits; under one twice as far it doesn't.
    expect(niceCeiling(100, [210, 300])).toBe(110);
    expect(niceCeiling(123, [210, 300])).toBe(130);
  });

  it('rounds 5% above the peak up to the next 10 past the last edge', () => {
    expect(niceCeiling(620, EDGES_250)).toBe(660);
  });

  it('lands exactly on a multiple of 10 without overshooting it', () => {
    // 200 × 1.05 is 210.00000000000003 in floating point.
    expect(niceCeiling(200, [])).toBe(210);
  });

  it('never collapses to zero, so the scale stays drawable', () => {
    expect(niceCeiling(0, EDGES_250)).toBe(10);
  });
});

/** Coggan zones: edges at 55, 75, 90, 105, 120 and 150% FTP. */
const COGGAN = resolveZoneConfig(null);

const GAP = { minPct: 0, maxPct: 0, zone: 1 } as const;

function planned(
  blocks: WorkoutBlock[],
  ftp: number | null,
  zoneTimes: ZoneTimes | null = null,
): ProfileStrip<WorkoutProfileSummary> {
  return {
    blocks,
    summary: { durationSeconds: 3600, stepCount: blocks.length, peakFtpPct: 0 },
    ftp,
    zoneTimes,
  };
}

function recorded(
  blocks: WorkoutBlock[],
  ftp: number | null,
  stream: PowerStream | null = null,
  zoneTimes: ZoneTimes | null = null,
): RecordedStrip {
  return {
    blocks,
    summary: {
      startSeconds: 0,
      durationSeconds: 3600,
      segmentCount: blocks.length,
      peakFtpPct: 0,
    },
    ftp,
    zoneTimes,
    stream,
  };
}

/** A plot 300 px wide: 150 buckets of a stream, 2 px each. */
const PLOT_WIDTH = 300;

function card(overrides: Partial<ProfileCard>): ProfileCard {
  return { durationSeconds: 3600, planned: null, recorded: null, ...overrides };
}

describe('buildDetailedProfile', () => {
  it("places a strip's blocks on the card's time scale, in %FTP and watts, at their height on the scale", () => {
    const profile = buildDetailedProfile(
      card({
        planned: planned(
          [
            { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
            { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
          ],
          250,
        ),
      }),
      { zoneConfig: COGGAN, ftp: 250 },
      PLOT_WIDTH,
    );

    expect(profile.planned?.segments).toEqual([
      {
        start: 0,
        end: 1800,
        minPct: 60,
        maxPct: 60,
        minWatts: 150,
        maxWatts: 150,
        low: 150,
        high: 150,
        zone: 2,
      },
      {
        start: 1800,
        end: 3600,
        minPct: 100,
        maxPct: 110,
        minWatts: 250,
        maxWatts: 275,
        low: 250,
        high: 275,
        zone: 4,
      },
    ]);
  });

  it("leaves the time a strip doesn't draw, a stop or past its end, without a segment, and a strip with no FTP without watts", () => {
    const profile = buildDetailedProfile(
      card({
        recorded: recorded(
          [
            { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 2 },
            { widthFraction: 0.25, ...GAP },
            { widthFraction: 0.25, minPct: 98, maxPct: 98, zone: 4 },
            { widthFraction: 0.25, ...GAP },
          ],
          null,
        ),
      }),
      { zoneConfig: COGGAN, ftp: null },
      PLOT_WIDTH,
    );

    expect(profile.recorded?.segments).toEqual([
      {
        start: 0,
        end: 900,
        minPct: 55,
        maxPct: 55,
        minWatts: null,
        maxWatts: null,
        low: 55,
        high: 55,
        zone: 2,
      },
      {
        start: 1800,
        end: 2700,
        minPct: 98,
        maxPct: 98,
        minWatts: null,
        maxWatts: null,
        low: 98,
        high: 98,
        zone: 4,
      },
    ]);
  });

  describe('from a power stream', () => {
    /** One tick a second from `from`, `count` of them, all at `watts`. */
    function steady(from: number, count: number, watts: number): PowerStream {
      return {
        time: Array.from({ length: count }, (_, i) => from + i),
        watts: Array.from({ length: count }, () => watts),
      };
    }

    /** An hour: 30 min at 200 W, then 30 min at 300 W. */
    const STEP_UP: PowerStream = {
      time: [...steady(0, 1800, 200).time, ...steady(1800, 1800, 300).time],
      watts: [...steady(0, 1800, 200).watts, ...steady(1800, 1800, 300).watts],
    };

    /** Blocks the stream draws in place of: one 60% interval. */
    const BLOCKS: WorkoutBlock[] = [
      { widthFraction: 1, minPct: 60, maxPct: 60, zone: 2 },
    ];

    it('draws the ride from its stream, in buckets 2 px wide across the plot, in watts and %FTP of its FTP', () => {
      const profile = buildDetailedProfile(
        card({ recorded: recorded(BLOCKS, 250, steady(0, 3600, 200)) }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );
      const segments = profile.recorded?.segments ?? [];

      // 3600 s over 150 buckets: 24 s each.
      expect(segments).toHaveLength(150);
      expect(segments[0]).toEqual({
        start: 0,
        end: 24,
        minPct: 80,
        maxPct: 80,
        minWatts: 200,
        maxWatts: 200,
        low: 200,
        high: 200,
        zone: 3,
      });
      expect(segments[149]).toMatchObject({ start: 3576, end: 3600 });
    });

    it("puts each bucket in the athlete's zone for its %FTP", () => {
      // 80% FTP tops this athlete's Z2, where Coggan's Z3 starts at 75%.
      const zoneConfig = resolveZoneConfig({
        powerZones: [60, 80, 95, 110, 130, 160, 220],
      });
      const profile = buildDetailedProfile(
        card({ recorded: recorded(BLOCKS, 250, steady(0, 3600, 200)) }),
        { zoneConfig, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.recorded?.segments[0].zone).toBe(2);
    });

    it("ends the ride early on a longer card, with the plan's time scale", () => {
      // The plan lasts 2 h; the ride's hour fills the first 75 of 150 buckets.
      const profile = buildDetailedProfile(
        card({
          durationSeconds: 7200,
          recorded: recorded(BLOCKS, 250, steady(0, 3600, 200)),
        }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.recorded?.segments).toHaveLength(75);
      expect(profile.recorded?.segments.at(-1)).toMatchObject({
        start: 3552,
        end: 3600,
      });
    });

    it("tops the shared scale and reads its power from the stream's peak and average", () => {
      const profile = buildDetailedProfile(
        card({ recorded: recorded(BLOCKS, 250, STEP_UP) }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      // A 300 W peak sits on the Z5 edge at 250 W, so the Z6 edge tops it.
      expect(profile.scale).toEqual({
        unit: 'watts',
        ceiling: 375,
        gridlines: [138, 188, 225, 263, 300],
      });
      expect(profile.recorded?.power).toEqual({
        unit: 'watts',
        peak: 300,
        average: 250,
      });
    });

    it('sits on a %FTP scale when there is no current FTP for the zone edges', () => {
      const profile = buildDetailedProfile(
        card({ recorded: recorded(BLOCKS, 250, steady(0, 3600, 200)) }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.scale.unit).toBe('ftpPct');
      expect(profile.recorded?.segments[0]).toMatchObject({
        maxWatts: 200,
        low: 80,
        high: 80,
      });
    });
  });

  describe('scale', () => {
    const PLAN_TO_110 = [
      { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
      { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
    ] satisfies WorkoutBlock[];

    it('is in watts, with dashed zone edges at the current FTP up to the first edge above the peak', () => {
      // 110% of 250 W peaks at 275 W, under the 300 W Z5 edge.
      const profile = buildDetailedProfile(
        card({ planned: planned(PLAN_TO_110, 250) }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.scale).toEqual({
        unit: 'watts',
        ceiling: 300,
        gridlines: [138, 188, 225, 263],
      });
    });

    it("is shared by both strips, topped by the higher one's peak", () => {
      // The ride peaks at 130% of its own 240 W FTP: 312 W, past the plan's 275 W.
      const profile = buildDetailedProfile(
        card({
          planned: planned(PLAN_TO_110, 250),
          recorded: recorded(
            [
              { widthFraction: 0.5, minPct: 70, maxPct: 70, zone: 2 },
              { widthFraction: 0.5, minPct: 130, maxPct: 130, zone: 6 },
            ],
            240,
          ),
        }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.scale).toEqual({
        unit: 'watts',
        ceiling: 375,
        gridlines: [138, 188, 225, 263, 300],
      });
    });

    it('is in %FTP for the whole card when a strip has no FTP, so the scale stays shared', () => {
      const profile = buildDetailedProfile(
        card({
          planned: planned(PLAN_TO_110, null),
          recorded: recorded(
            [{ widthFraction: 1, minPct: 95, maxPct: 95, zone: 4 }],
            240,
          ),
        }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.scale).toEqual({
        unit: 'ftpPct',
        ceiling: 120,
        gridlines: [55, 75, 90, 105],
      });
      // The ride keeps its watts, but sits on the scale in %FTP.
      expect(profile.recorded?.segments[0]).toMatchObject({
        maxWatts: 228,
        low: 95,
        high: 95,
      });
    });

    it("draws no line at the top of the last zone, which isn't an edge between zones", () => {
      // Coggan's Z7 runs from 150% to 200%; a 210% sprint sits in it all the same.
      const profile = buildDetailedProfile(
        card({
          recorded: recorded(
            [{ widthFraction: 1, minPct: 210, maxPct: 210, zone: 7 }],
            null,
          ),
        }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.scale).toEqual({
        unit: 'ftpPct',
        ceiling: 230,
        gridlines: [55, 75, 90, 105, 120, 150],
      });
    });

    it('is in %FTP when there is no current FTP to draw the zone edges at', () => {
      // Activity Details: the ride kept its FTP, but the athlete has none today.
      const profile = buildDetailedProfile(
        card({
          recorded: recorded(
            [{ widthFraction: 1, minPct: 95, maxPct: 95, zone: 4 }],
            240,
          ),
        }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.scale.unit).toBe('ftpPct');
    });
  });

  describe('power', () => {
    it("is each strip's peak and time-weighted average watts, rounded", () => {
      // 1800 s at 150 W, then 1800 s at 250–275 W, read at its 262.5 W middle.
      const profile = buildDetailedProfile(
        card({
          planned: planned(
            [
              { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
              { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
            ],
            250,
          ),
        }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.planned?.power).toEqual({
        unit: 'watts',
        peak: 275,
        average: 206,
      });
    });

    it('is in %FTP for a strip with no FTP, averaged over the time it draws', () => {
      const profile = buildDetailedProfile(
        card({
          recorded: recorded(
            [
              { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 2 },
              { widthFraction: 0.25, ...GAP },
              { widthFraction: 0.25, minPct: 98, maxPct: 98, zone: 4 },
              { widthFraction: 0.25, ...GAP },
            ],
            null,
          ),
        }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.recorded?.power).toEqual({
        unit: 'ftpPct',
        peak: 98,
        average: 77,
      });
    });

    it("is in watts for a strip with an FTP, even when the card's scale is in %FTP", () => {
      const profile = buildDetailedProfile(
        card({
          planned: planned(
            [{ widthFraction: 1, minPct: 60, maxPct: 60, zone: 2 }],
            null,
          ),
          recorded: recorded(
            [{ widthFraction: 1, minPct: 95, maxPct: 95, zone: 4 }],
            240,
          ),
        }),
        { zoneConfig: COGGAN, ftp: null },
        PLOT_WIDTH,
      );

      expect(profile.scale.unit).toBe('ftpPct');
      expect(profile.planned?.power).toEqual({
        unit: 'ftpPct',
        peak: 60,
        average: 60,
      });
      expect(profile.recorded?.power).toEqual({
        unit: 'watts',
        peak: 228,
        average: 228,
      });
    });

    it('is zero for a strip that draws nothing, such as a ride at 0 W throughout', () => {
      const profile = buildDetailedProfile(
        card({
          recorded: recorded(
            [{ widthFraction: 1, minPct: 0, maxPct: 0, zone: 1 }],
            240,
          ),
        }),
        { zoneConfig: COGGAN, ftp: 250 },
        PLOT_WIDTH,
      );

      expect(profile.recorded?.power).toEqual({
        unit: 'watts',
        peak: 0,
        average: 0,
      });
      expect(profile.scale.ceiling).toBeGreaterThan(0);
    });
  });
});

describe('buildDetailedProfile time in zone', () => {
  const BLOCKS: WorkoutBlock[] = [
    { widthFraction: 0.25, minPct: 60, maxPct: 60, zone: 2 },
    { widthFraction: 0.25, ...GAP },
    { widthFraction: 0.5, minPct: 100, maxPct: 100, zone: 4 },
  ];

  it("lists the plan's time from its steps above the ride's from intervals.icu", () => {
    const profile = buildDetailedProfile(
      card({
        planned: planned(BLOCKS, 250, {
          1: 0,
          2: 1200,
          3: 0,
          4: 2400,
          5: 0,
          6: 0,
          7: 0,
        }),
        recorded: recorded(BLOCKS, 250, null, {
          1: 300,
          2: 1500,
          3: 0,
          4: 1800,
          5: 0,
          6: 0,
          7: 0,
        }),
      }),
      { zoneConfig: COGGAN, ftp: 250 },
      PLOT_WIDTH,
    );

    expect(profile.timeInZone).toEqual([
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

  it("counts the ride's time from what its strip draws when intervals.icu kept none, leaving out stops", () => {
    const profile = buildDetailedProfile(
      card({ recorded: recorded(BLOCKS, 250) }),
      { zoneConfig: COGGAN, ftp: 250 },
      PLOT_WIDTH,
    );

    expect(profile.timeInZone).toEqual([
      { zone: 2, planned: null, recorded: { seconds: 900, share: 0.5 } },
      { zone: 4, planned: null, recorded: { seconds: 1800, share: 1 } },
    ]);
  });

  it.each([300, 731])(
    "counts the ride's time from its stream's buckets when intervals.icu kept none, the whole ride at a %i px plot",
    plotWidth => {
      // 30 min at 200 W (80%, Z3), then 30 min at 280 W (112%, Z5), in place
      // of blocks with time in Z2.
      const stream: PowerStream = {
        time: Array.from({ length: 3600 }, (_, i) => i),
        watts: Array.from({ length: 3600 }, (_, i) => (i < 1800 ? 200 : 280)),
      };
      const profile = buildDetailedProfile(
        card({ recorded: recorded(BLOCKS, 250, stream) }),
        { zoneConfig: COGGAN, ftp: 250 },
        plotWidth,
      );
      const seconds = new Map(
        profile.timeInZone.map(({ zone, recorded }) => [
          zone,
          recorded?.seconds ?? 0,
        ]),
      );
      const total = [...seconds.values()].reduce((sum, s) => sum + s, 0);
      const bucketSeconds = 3600 / Math.floor(plotWidth / 2);

      expect(seconds.has(2)).toBe(false);
      // Rounded per zone, so within a second or two of the whole hour.
      expect(Math.abs(total - 3600)).toBeLessThanOrEqual(2);
      // The bucket across the step-up may average into Z4.
      expect(Math.abs((seconds.get(3) ?? 0) - 1800)).toBeLessThanOrEqual(
        bucketSeconds,
      );
      expect(Math.abs((seconds.get(5) ?? 0) - 1800)).toBeLessThanOrEqual(
        bucketSeconds,
      );
    },
  );
});

describe('axisLabels', () => {
  it('labels zero, the ceiling and every gridline far enough from its neighbours', () => {
    // 100 px for 375 W: 225 W and 300 W sit under 12 px from the labels below.
    expect(
      axisLabels(
        { unit: 'watts', ceiling: 375, gridlines: [138, 188, 225, 263, 300] },
        100,
        12,
      ),
    ).toEqual([0, 138, 188, 263, 375]);
  });
});
