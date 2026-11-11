import { useProfileCard } from '../useProfileCard';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { buildDetailedProfile } from '@/lib/detailedProfile';
import {
  type IntervalsActivity,
  IntervalsApiError,
  getActivity,
  getActivityStreams,
  getAthleteSettings,
} from '@/lib/intervalsApi';
import { resolveRideSettings } from '@/lib/rideSettings';
import type { ZoneTimes } from '@/lib/timeInZone';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';
import type { WorkoutBlock } from '@/lib/workoutProfile';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivity: jest.fn(),
  getActivityStreams: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockGetActivity = getActivity as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;
const mockGetActivityStreams = getActivityStreams as jest.Mock;

/** The athlete's current Ride FTP. */
const CURRENT_FTP = 250;

const ACTIVITY_ID = 'i196064284';

const PLANNED_BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 60, maxPct: 60, zone: 2 },
  { widthFraction: 0.5, minPct: 100, maxPct: 100, zone: 4 },
];

const PLAN_SUMMARY: WorkoutProfileSummary = {
  durationSeconds: 1200,
  stepCount: 2,
  peakFtpPct: 100,
};

/** The plan's time in zone, as its steps ask for it. */
const PLAN_ZONE_TIMES: ZoneTimes = {
  1: 0,
  2: 600,
  3: 0,
  4: 600,
  5: 0,
  6: 0,
  7: 0,
};

/** A ride whose intervals draw a 600 s Activity Profile. */
const RIDE: IntervalsActivity = {
  id: ACTIVITY_ID,
  name: 'Popołudniowa jazda',
  type: 'Ride',
  start_date_local: '2026-10-23T16:42:00',
  moving_time: 600,
  distance: 5000,
  icu_intervals: [
    { start_time: 0, end_time: 300, intensity: 60, zone: 2 },
    { start_time: 300, end_time: 600, intensity: 100, zone: 4 },
  ],
};

/** Renders the card of a Workout read with the athlete's Ride settings. */
function renderCard(recordedActivityId: string | null) {
  return renderHookWithClient(() =>
    useProfileCard({
      blocks: PLANNED_BLOCKS,
      profileSummary: PLAN_SUMMARY,
      zoneTimes: PLAN_ZONE_TIMES,
      rideSettings: resolveRideSettings({ ftp: CURRENT_FTP }),
      recordedActivityId,
    }),
  );
}

/** The ride's power stream, as intervals.icu returns it: 10 minutes at 200 W. */
const STREAMS = [
  { type: 'time', data: Array.from({ length: 600 }, (_, i) => i) },
  { type: 'watts', data: Array.from({ length: 600 }, () => 200) },
];

/** The plan alone, at the current FTP. */
const PLAN_ALONE = {
  card: {
    durationSeconds: 1200,
    recorded: null,
    planned: {
      blocks: PLANNED_BLOCKS,
      summary: PLAN_SUMMARY,
      ftp: CURRENT_FTP,
    },
  },
  settings: { ftp: CURRENT_FTP },
};

beforeEach(() => {
  jest.clearAllMocks();
  (useIntervalsConnection as jest.Mock).mockReturnValue({
    isConnected: true,
    athleteName: null,
    athleteId: 'athlete-1',
    accessToken: 'token-1',
    loading: false,
  });
});

describe('useProfileCard', () => {
  it('fetches nothing and shows the plan alone without a paired Activity', async () => {
    const { result } = await renderCard(null);

    expect(result.current).toMatchObject(PLAN_ALONE);
    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it("shows the plan while the Activity and its stream load, then the ride's strip below it, drawn from the stream", async () => {
    mockGetActivity.mockResolvedValue(RIDE);
    mockGetActivityStreams.mockResolvedValue(STREAMS);

    const { result } = await renderCard(ACTIVITY_ID);

    expect(result.current).toMatchObject(PLAN_ALONE);

    await waitFor(() => expect(result.current?.card.recorded).not.toBeNull());
    expect(mockGetActivity).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      { intervals: true },
      expect.anything(),
    );
    expect(mockGetActivityStreams).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      { types: ['time', 'watts'] },
      expect.anything(),
    );
    expect(result.current?.card.durationSeconds).toBe(1200);
    // The ride kept no FTP of its own, so it's drawn at the current one.
    expect(result.current?.card.recorded).toMatchObject({
      ftp: CURRENT_FTP,
      stream: { time: STREAMS[0].data, watts: STREAMS[1].data },
    });
  });

  it('keeps the plan alone until the stream settles, never showing the ride from its intervals first', async () => {
    mockGetActivity.mockResolvedValue(RIDE);
    mockGetActivityStreams.mockReturnValue(new Promise(() => {}));

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(mockGetActivityStreams).toHaveBeenCalled());
    expect(result.current).toMatchObject(PLAN_ALONE);
  });

  it('draws the ride from its detected intervals when it has no stream', async () => {
    mockGetActivity.mockResolvedValue(RIDE);
    mockGetActivityStreams.mockRejectedValue(new IntervalsApiError(404));

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(result.current?.card.recorded).not.toBeNull());
    expect(result.current?.card.recorded).toMatchObject({
      blocks: [
        expect.objectContaining({ minPct: 60, zone: 2 }),
        expect.objectContaining({ minPct: 100, zone: 4 }),
        expect.objectContaining({ maxPct: 0 }),
      ],
      stream: null,
    });
  });

  it("lists the plan's time in zone above the ride's from intervals.icu, not from its stream", async () => {
    mockGetActivity.mockResolvedValue({
      ...RIDE,
      icu_zone_times: [
        { id: 'Z1', secs: 30 },
        { id: 'Z2', secs: 290 },
        { id: 'Z4', secs: 280 },
        { id: 'SS', secs: 120 },
      ],
    });
    mockGetActivityStreams.mockResolvedValue(STREAMS);

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(result.current?.card.recorded).not.toBeNull());
    const { card, settings } = result.current!;

    expect(buildDetailedProfile(card, settings, 300).timeInZone).toEqual([
      {
        zone: 1,
        planned: { seconds: 0, share: 0 },
        recorded: { seconds: 30, share: 0.05 },
      },
      {
        zone: 2,
        planned: { seconds: 600, share: 1 },
        recorded: { seconds: 290, share: expect.closeTo(0.483, 3) },
      },
      {
        zone: 4,
        planned: { seconds: 600, share: 1 },
        recorded: { seconds: 280, share: expect.closeTo(0.467, 3) },
      },
    ]);
  });

  it('keeps the plan alone when the Activity fails to load', async () => {
    mockGetActivity.mockRejectedValue(new Error('offline'));

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(mockGetActivity).toHaveBeenCalled());
    expect(result.current).toMatchObject(PLAN_ALONE);
  });

  it("shows the plan at once, in watts, by the Workout's own Ride settings while the athlete's settings aren't cached", async () => {
    mockGetAthleteSettings.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() =>
      useProfileCard({
        blocks: PLANNED_BLOCKS,
        profileSummary: PLAN_SUMMARY,
        zoneTimes: PLAN_ZONE_TIMES,
        rideSettings: resolveRideSettings({ ftp: CURRENT_FTP }),
        recordedActivityId: null,
      }),
    );

    expect(result.current).toMatchObject(PLAN_ALONE);
    expect(mockGetAthleteSettings).not.toHaveBeenCalled();
  });

  it("draws the card on Coggan's zones with no FTP when the Workout was read without the athlete's settings", async () => {
    const { result } = await renderHookWithClient(() =>
      useProfileCard({
        blocks: PLANNED_BLOCKS,
        profileSummary: PLAN_SUMMARY,
        zoneTimes: PLAN_ZONE_TIMES,
        rideSettings: resolveRideSettings(null),
        recordedActivityId: null,
      }),
    );

    expect(result.current?.settings).toEqual(resolveRideSettings(null));
    expect(result.current?.card.planned?.ftp).toBeNull();
  });
});
