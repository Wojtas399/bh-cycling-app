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

const COGGAN_EDGES_AT_250_W_FTP = [137.5, 187.5, 225, 262.5, 300, 375];

describe('niceCeiling', () => {
  it('tops out at the first zone edge above the peak, so the next zone shows as headroom', () => {
    expect(niceCeiling(280, COGGAN_EDGES_AT_250_W_FTP)).toBe(300);
  });

  it('skips past an edge the peak sits on', () => {
    expect(niceCeiling(300, COGGAN_EDGES_AT_250_W_FTP)).toBe(375);
  });

  it('rounds 5% above the peak up to the next 10 when the next edge is more than 1.5× away, as 210 W is from 100 W', () => {
    expect(niceCeiling(100, [210, 300])).toBe(110);
    expect(niceCeiling(123, [210, 300])).toBe(130);
  });

  it('rounds 5% above the peak up to the next 10 past the last edge', () => {
    expect(niceCeiling(620, COGGAN_EDGES_AT_250_W_FTP)).toBe(660);
  });

  it('lands exactly on a multiple of 10 without overshooting it', () => {
    expect(niceCeiling(200, [])).toBe(210);
  });

  it('ignores floating-point noise in the headroom, so a 333⅓ peak tops out at 350, not 360', () => {
    expect(niceCeiling((340 / 102) * 100, [])).toBe(350);
  });

  it('never collapses to zero, so the scale stays drawable', () => {
    expect(niceCeiling(0, COGGAN_EDGES_AT_250_W_FTP)).toBe(10);
  });
});

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
        startSeconds: 0,
        endSeconds: 900,
        minPct: 55,
        maxPct: 55,
        minWatts: null,
        maxWatts: null,
        lowOnScale: 55,
        highOnScale: 55,
        zone: 2,
      },
      {
        startSeconds: 1800,
        endSeconds: 2700,
        minPct: 98,
        maxPct: 98,
        minWatts: null,
        maxWatts: null,
        lowOnScale: 98,
        highOnScale: 98,
        zone: 4,
      },
    ]);
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
      const profile = buildDetailedProfile(
        card({ planned: planned(RAMP_UP_THEN_DOWN, 200) }),
        { zoneConfig: COGGAN, ftp: 250 },
      );

      expect(profile.planned?.segments.map(({ ramp }) => ramp)).toEqual([
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

    it('carry their direction on a %FTP scale, with no watts when the strip has no FTP', () => {
      const profile = buildDetailedProfile(
        card({ planned: planned(RAMP_UP_THEN_DOWN, null) }),
        { zoneConfig: COGGAN, ftp: 250 },
      );

      expect(profile.planned?.segments.map(({ ramp }) => ramp)).toEqual([
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
      const settings = { zoneConfig: COGGAN, ftp: 250 };
      const ramps = buildDetailedProfile(
        card({ planned: planned(RAMP_UP_THEN_DOWN, 250) }),
        settings,
      );
      const ranges = buildDetailedProfile(
        card({ planned: planned(asRanges, 250) }),
        settings,
      );

      expect(ranges.planned?.segments.map(({ ramp }) => ramp)).toEqual([
        undefined,
        undefined,
      ]);
      expect(ramps.scale).toEqual(ranges.scale);
      expect(ramps.planned?.power).toEqual({
        unit: 'watts',
        peak: 225,
        peakFtpPct: 90,
        average: 163,
      });
      expect(ramps.planned?.power).toEqual(ranges.planned?.power);
      expect(ramps.timeInZone).toEqual(ranges.timeInZone);
    });
  });

  describe('scale', () => {
    const PLAN_TO_110 = [
      { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
      { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
    ] satisfies WorkoutBlock[];

    it('is in watts, with dashed zone edges at the current FTP up to the first edge above the peak, the 300 W Z5 edge over a 275 W peak', () => {
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

    it("is shared by both strips, topped by the higher one's peak: the ride's 312 W, 130% of its own 240 W FTP, past the plan's 275 W", () => {
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
      const rideKeepingItsWattsOnAPctScale = profile.recorded?.segments[0];

      expect(rideKeepingItsWattsOnAPctScale).toMatchObject({
        maxWatts: 228,
        lowOnScale: 95,
        highOnScale: 95,
      });
    });

    it("draws no line at the top of the last zone, which isn't an edge between zones, so a 210% sprint still sits in Coggan's Z7", () => {
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

    it('is in %FTP when there is no current FTP to draw the zone edges at, as for a ride that kept its FTP on Activity Details', () => {
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
    it("is each strip's peak and time-weighted average watts, rounded, a range read at its middle", () => {
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
