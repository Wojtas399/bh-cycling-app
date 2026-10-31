import { useProfileCard } from '../useProfileCard';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { type IntervalsActivity, getActivity } from '@/lib/intervalsApi';
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
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockGetActivity = getActivity as jest.Mock;

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

function renderCard(recordedActivityId: string | null) {
  return renderHookWithClient(() =>
    useProfileCard({
      blocks: PLANNED_BLOCKS,
      profileSummary: PLAN_SUMMARY,
      recordedActivityId,
    }),
  );
}

const PLAN_ALONE = {
  durationSeconds: 1200,
  recorded: null,
  planned: { blocks: PLANNED_BLOCKS, summary: PLAN_SUMMARY },
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

    expect(result.current).toEqual(PLAN_ALONE);
    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it("shows the plan while the Activity loads, then the ride's strip above it", async () => {
    mockGetActivity.mockResolvedValue(RIDE);

    const { result } = await renderCard(ACTIVITY_ID);

    expect(result.current).toEqual(PLAN_ALONE);

    await waitFor(() => expect(result.current?.recorded).not.toBeNull());
    expect(mockGetActivity).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      { intervals: true },
      expect.anything(),
    );
    expect(result.current?.durationSeconds).toBe(1200);
    expect(result.current?.recorded?.blocks).toEqual([
      { widthFraction: 0.25, minPct: 60, maxPct: 60, zone: 2 },
      { widthFraction: 0.25, minPct: 100, maxPct: 100, zone: 4 },
      { widthFraction: 0.5, minPct: 0, maxPct: 0, zone: 1 },
    ]);
  });

  it('keeps the plan alone when the Activity fails to load', async () => {
    mockGetActivity.mockRejectedValue(new Error('offline'));

    const { result } = await renderCard(ACTIVITY_ID);

    await waitFor(() => expect(mockGetActivity).toHaveBeenCalled());
    expect(result.current).toEqual(PLAN_ALONE);
  });
});
