import { useProfileCard } from '../useProfileCard';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  type IntervalsActivity,
  getActivity,
  getAthleteSettings,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { resolveRideSettings } from '@/lib/rideSettings';
import type { ZoneTimes } from '@/lib/timeInZone';
import type { WorkoutProfileSummary } from '@/lib/workoutDetails';
import type { WorkoutBlock } from '@/lib/workoutProfile';
import {
  createTestQueryClient,
  renderHookWithClient,
} from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivity: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockGetActivity = getActivity as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

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

/**
 * Renders the card with the athlete's settings already cached, as Workout
 * Details' own query leaves them.
 */
function renderCard(recordedActivityId: string | null) {
  const client = createTestQueryClient();

  client.setQueryData(
    intervalsKeys.athleteSettings('athlete-1'),
    resolveRideSettings({ ftp: CURRENT_FTP }),
  );

  return renderHookWithClient(
    () =>
      useProfileCard({
        blocks: PLANNED_BLOCKS,
        profileSummary: PLAN_SUMMARY,
        zoneTimes: PLAN_ZONE_TIMES,
        recordedActivityId,
      }),
    { client },
  );
}

/** The plan alone, in watts at the current FTP. */
const PLAN_ALONE = {
  durationSeconds: 1200,
  recorded: null,
  planned: {
    summary: PLAN_SUMMARY,
    ftp: CURRENT_FTP,
    segments: [
      expect.objectContaining({ start: 0, end: 600, maxWatts: 150 }),
      expect.objectContaining({ start: 600, end: 1200, maxWatts: 250 }),
    ],
    power: { unit: 'watts', peak: 250, average: 200 },
  },
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

  it("shows the plan while the Activity loads, then the ride's strip below it", async () => {
    mockGetActivity.mockResolvedValue(RIDE);

    const { result } = await renderCard(ACTIVITY_ID);

    expect(result.current).toMatchObject(PLAN_ALONE);

    await waitFor(() => expect(result.current?.recorded).not.toBeNull());
    expect(mockGetActivity).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      { intervals: true },
      expect.anything(),
    );
    expect(result.current?.durationSeconds).toBe(1200);
    // The ride kept no FTP of its own, so it's drawn at the current one.
    expect(result.current?.recorded?.segments).toEqual([
      expect.objectContaining({ start: 0, end: 300, maxWatts: 150, zone: 2 }),
      expect.objectContaining({ start: 300, end: 600, maxWatts: 250, zone: 4 }),
    ]);
  });

  it("lists the plan's time in zone above the ride's from intervals.icu", async () => {
    mockGetActivity.mockResolvedValue({
      ...RIDE,
      icu_zone_times: [
        { id: 'Z1', secs: 30 },
        { id: 'Z2', secs: 290 },
        { id: 'Z4', secs: 280 },
        { id: 'SS', secs: 120 },
      ],
    });

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(result.current?.recorded).not.toBeNull());
    expect(result.current?.timeInZone).toEqual([
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

  it("holds the card until the athlete's settings first load, so it never redraws from %FTP to watts", async () => {
    mockGetAthleteSettings.mockResolvedValue({ ftp: CURRENT_FTP });

    const { result } = await renderHookWithClient(() =>
      useProfileCard({
        blocks: PLANNED_BLOCKS,
        profileSummary: PLAN_SUMMARY,
        zoneTimes: PLAN_ZONE_TIMES,
        recordedActivityId: null,
      }),
    );

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toMatchObject(PLAN_ALONE));
  });

  it("draws the card in %FTP on Coggan's zones when the athlete's settings fail", async () => {
    mockGetAthleteSettings.mockRejectedValue(new Error('offline'));

    const { result } = await renderHookWithClient(() =>
      useProfileCard({
        blocks: PLANNED_BLOCKS,
        profileSummary: PLAN_SUMMARY,
        zoneTimes: PLAN_ZONE_TIMES,
        recordedActivityId: null,
      }),
    );

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.scale).toEqual({
      unit: 'ftpPct',
      ceiling: 105,
      gridlines: [55, 75, 90],
    });
  });
});
