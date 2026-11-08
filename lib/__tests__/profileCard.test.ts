import type { ActivityDetails } from '../activityDetails';
import { buildProfileCard } from '../profileCard';
import type { WorkoutProfileSummary } from '../workoutDetails';
import type { WorkoutBlock } from '../workoutProfile';

const PLANNED_BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
  { widthFraction: 0.5, minPct: 100, maxPct: 110, zone: 4 },
];

const RECORDED_BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 2 },
  { widthFraction: 0.75, minPct: 98, maxPct: 98, zone: 4 },
];

const GAP = { minPct: 0, maxPct: 0, zone: 1 };

function plan(durationSeconds: number): {
  blocks: WorkoutBlock[];
  profileSummary: WorkoutProfileSummary;
} {
  return {
    blocks: PLANNED_BLOCKS,
    profileSummary: { durationSeconds, stepCount: 2, peakFtpPct: 110 },
  };
}

const NO_PLAN = { blocks: [], profileSummary: null };

function ride(
  durationSeconds: number,
): Extract<ActivityDetails, { isStravaActivity: false }> {
  return {
    isStravaActivity: false,
    title: 'Ride',
    type: 'Ride',
    startLocal: '2026-10-14T18:00:00',
    blocks: RECORDED_BLOCKS,
    profileSummary: { durationSeconds, segmentCount: 2, peakFtpPct: 98 },
    metrics: [],
    route: null,
    pairedEventId: null,
  };
}

const rideWithoutProfile: ActivityDetails = {
  ...ride(3600),
  blocks: [],
  profileSummary: null,
};

describe('buildProfileCard', () => {
  it('draws both strips at full width when they last as long', () => {
    expect(buildProfileCard(plan(3600), ride(3600))).toEqual({
      durationSeconds: 3600,
      recorded: {
        blocks: RECORDED_BLOCKS,
        summary: { durationSeconds: 3600, segmentCount: 2, peakFtpPct: 98 },
      },
      planned: {
        blocks: PLANNED_BLOCKS,
        summary: { durationSeconds: 3600, stepCount: 2, peakFtpPct: 110 },
      },
    });
  });

  it('ends the planned strip early when the ride ran longer', () => {
    const card = buildProfileCard(plan(3000), ride(4000));

    expect(card?.durationSeconds).toBe(4000);
    expect(card?.recorded?.blocks).toEqual(RECORDED_BLOCKS);
    expect(card?.planned?.blocks).toEqual([
      { ...PLANNED_BLOCKS[0], widthFraction: 0.375 },
      { ...PLANNED_BLOCKS[1], widthFraction: 0.375 },
      { widthFraction: 0.25, ...GAP },
    ]);
  });

  it('ends the recorded strip early when the ride was shorter', () => {
    const card = buildProfileCard(plan(4000), ride(2000));

    expect(card?.durationSeconds).toBe(4000);
    expect(card?.planned?.blocks).toEqual(PLANNED_BLOCKS);
    expect(card?.recorded?.blocks).toEqual([
      { ...RECORDED_BLOCKS[0], widthFraction: 0.125 },
      { ...RECORDED_BLOCKS[1], widthFraction: 0.375 },
      { widthFraction: 0.5, ...GAP },
    ]);
  });

  it('keeps each strip’s own summary, unscaled', () => {
    const card = buildProfileCard(plan(3000), ride(4000));

    expect(card?.planned?.summary.durationSeconds).toBe(3000);
    expect(card?.recorded?.summary.durationSeconds).toBe(4000);
  });

  it.each<[string, ActivityDetails | undefined]>([
    ['still loading or failed', undefined],
    ['a Strava Activity', { isStravaActivity: true }],
    ['no drawable profile', rideWithoutProfile],
  ])('shows the plan alone, as before, with an Activity %s', (_, activity) => {
    expect(buildProfileCard(plan(3600), activity)).toEqual({
      durationSeconds: 3600,
      recorded: null,
      planned: {
        blocks: PLANNED_BLOCKS,
        summary: { durationSeconds: 3600, stepCount: 2, peakFtpPct: 110 },
      },
    });
  });

  it('shows the recorded strip alone for a Workout without a profile', () => {
    expect(buildProfileCard(NO_PLAN, ride(2000))).toEqual({
      durationSeconds: 2000,
      recorded: {
        blocks: RECORDED_BLOCKS,
        summary: { durationSeconds: 2000, segmentCount: 2, peakFtpPct: 98 },
      },
      planned: null,
    });
  });

  it('is null when neither side has a profile', () => {
    expect(buildProfileCard(NO_PLAN, undefined)).toBeNull();
    expect(buildProfileCard(NO_PLAN, rideWithoutProfile)).toBeNull();
  });

  it('drops a plan with no known duration beside a ride, as it can’t be placed in time', () => {
    expect(buildProfileCard(plan(0), ride(2000))).toEqual({
      durationSeconds: 2000,
      recorded: {
        blocks: RECORDED_BLOCKS,
        summary: { durationSeconds: 2000, segmentCount: 2, peakFtpPct: 98 },
      },
      planned: null,
    });
  });

  it('leaves a plan with no known duration unscaled', () => {
    expect(buildProfileCard(plan(0), undefined)?.planned?.blocks).toEqual(
      PLANNED_BLOCKS,
    );
  });
});
