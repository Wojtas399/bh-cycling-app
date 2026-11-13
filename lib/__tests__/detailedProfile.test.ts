import type { ActivityProfileSummary } from '../activityDetails';
import {
  axisLabels,
  buildDetailedProfile,
  niceCeiling,
} from '../detailedProfile';
import { resolveZoneConfig } from '../powerZones';
import type { ProfileCard, ProfileStrip } from '../profileCard';
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
  zoneTimes: ZoneTimes | null = null,
): ProfileStrip<ActivityProfileSummary> {
  return {
    blocks,
    summary: {
      durationSeconds: 3600,
      segmentCount: blocks.length,
      peakFtpPct: 0,
    },
    ftp,
    zoneTimes,
  };
}

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
      );

      expect(profile.planned?.power).toEqual({
        unit: 'watts',
        peak: 275,
        peakFtpPct: 110,
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
      );

      expect(profile.recorded?.power).toEqual({
        unit: 'ftpPct',
        peak: 98,
        peakFtpPct: 98,
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
      );

      expect(profile.scale.unit).toBe('ftpPct');
      expect(profile.planned?.power).toEqual({
        unit: 'ftpPct',
        peak: 60,
        peakFtpPct: 60,
        average: 60,
      });
      expect(profile.recorded?.power).toEqual({
        unit: 'watts',
        peak: 228,
        peakFtpPct: 95,
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
      );

      expect(profile.recorded?.power).toEqual({
        unit: 'watts',
        peak: 0,
        peakFtpPct: 0,
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
        recorded: recorded(BLOCKS, 250, {
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
    );

    expect(profile.timeInZone).toEqual([
      { zone: 2, planned: null, recorded: { seconds: 900, share: 0.5 } },
      { zone: 4, planned: null, recorded: { seconds: 1800, share: 1 } },
    ]);
  });
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
