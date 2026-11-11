import { useDetailedProfile } from '../useDetailedProfile';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import type { ActivityDetails } from '@/lib/activityDetails';
import {
  IntervalsApiError,
  getActivityStreams,
  getAthleteSettings,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { NO_WORKOUT_PROFILE } from '@/lib/profileCard';
import { resolveRideSettings } from '@/lib/rideSettings';
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
  getActivityStreams: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockGetActivityStreams = getActivityStreams as jest.Mock;

const ACTIVITY_ID = 'i196064284';

const BLOCKS: WorkoutBlock[] = [
  { widthFraction: 1, minPct: 80, maxPct: 80, zone: 3 },
];

/** A ride with an Activity Profile of one 10-minute interval. */
const RIDE: ActivityDetails = {
  isStravaActivity: false,
  title: 'Popołudniowa jazda',
  type: 'Ride',
  startLocal: '2026-10-23T16:42:00',
  blocks: BLOCKS,
  profileSummary: {
    startSeconds: 0,
    durationSeconds: 600,
    segmentCount: 1,
    peakFtpPct: 80,
  },
  icuFtp: 250,
  zoneTimes: null,
  metrics: [],
  route: null,
  pairedEventId: null,
};

const RIDE_WITHOUT_PROFILE: ActivityDetails = {
  ...RIDE,
  blocks: [],
  profileSummary: null,
};

/** As intervals.icu returns them: 10 minutes at 200 W. */
const STREAMS = [
  { type: 'time', data: Array.from({ length: 600 }, (_, i) => i) },
  { type: 'watts', data: Array.from({ length: 600 }, () => 200) },
];

/** Activity Details' card for `activity`, with the settings cached or not. */
function renderProfile(
  activity: ActivityDetails | undefined,
  { settingsCached = true }: { settingsCached?: boolean } = {},
) {
  const client = createTestQueryClient();

  if (settingsCached) {
    client.setQueryData(
      intervalsKeys.athleteSettings('athlete-1'),
      resolveRideSettings({ ftp: 250 }),
    );
  }

  return renderHookWithClient(
    () => useDetailedProfile(NO_WORKOUT_PROFILE, ACTIVITY_ID, activity),
    { client },
  );
}

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

describe('useDetailedProfile', () => {
  it("draws the ride from its power stream once it's loaded", async () => {
    mockGetActivityStreams.mockResolvedValue(STREAMS);

    const { result } = await renderProfile(RIDE);

    await waitFor(() => expect(result.current.isSettled).toBe(true));
    expect(result.current.source?.card.recorded?.stream).toEqual({
      time: STREAMS[0].data,
      watts: STREAMS[1].data,
    });
    expect(mockGetActivityStreams).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      { types: ['time', 'watts'] },
      expect.anything(),
    );
  });

  it('holds the ride back, unsettled, until its stream has loaded', async () => {
    mockGetActivityStreams.mockReturnValue(new Promise(() => {}));

    const { result } = await renderProfile(RIDE);

    expect(result.current).toEqual({ source: null, isSettled: false });
  });

  it.each([
    ['intervals.icu has none (404)', new IntervalsApiError(404)],
    ['the call fails', new Error('offline')],
  ])(
    'falls back to the detected intervals, settled, when %s',
    async (_, error) => {
      mockGetActivityStreams.mockRejectedValue(error);

      const { result } = await renderProfile(RIDE);

      await waitFor(() => expect(result.current.isSettled).toBe(true));
      expect(result.current.source?.card.recorded).toMatchObject({
        blocks: BLOCKS,
        stream: null,
      });
      expect(mockGetActivityStreams).toHaveBeenCalledTimes(1);
    },
  );

  it.each<[string, ActivityDetails | undefined]>([
    ['no Activity Profile', RIDE_WITHOUT_PROFILE],
    ['a Strava Activity', { isStravaActivity: true }],
    ['no Activity', undefined],
  ])(
    'fetches no stream, and has no card to wait for, with %s',
    async (_, activity) => {
      const { result } = await renderProfile(activity);

      expect(result.current).toEqual({ source: null, isSettled: true });
      expect(mockGetActivityStreams).not.toHaveBeenCalled();
    },
  );

  it("is unsettled while the athlete's settings first load", async () => {
    mockGetActivityStreams.mockResolvedValue(STREAMS);
    (getAthleteSettings as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = await renderProfile(RIDE, { settingsCached: false });

    expect(result.current).toEqual({ source: null, isSettled: false });
  });
});
