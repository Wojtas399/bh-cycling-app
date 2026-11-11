import { useActivityStream } from '../useActivityStream';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { IntervalsApiError, getActivityStreams } from '@/lib/intervalsApi';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivityStreams: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockGetActivityStreams = getActivityStreams as jest.Mock;

const ACTIVITY_ID = 'i196064284';

/** As intervals.icu returns them: 10 minutes at 200 W. */
const STREAMS = [
  { type: 'time', data: Array.from({ length: 600 }, (_, i) => i) },
  { type: 'watts', data: Array.from({ length: 600 }, () => 200) },
];

function renderStream(activityId: string | null) {
  return renderHookWithClient(() => useActivityStream(activityId));
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

describe('useActivityStream', () => {
  it("reads the Activity's time and watts streams as its power stream", async () => {
    mockGetActivityStreams.mockResolvedValue(STREAMS);

    const { result } = await renderStream(ACTIVITY_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
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

  it('is loading until the stream first loads', async () => {
    mockGetActivityStreams.mockReturnValue(new Promise(() => {}));

    const { result } = await renderStream(ACTIVITY_ID);

    expect(result.current.isLoading).toBe(true);
  });

  it('has no stream (null) when intervals.icu has none (404)', async () => {
    mockGetActivityStreams.mockRejectedValue(new IntervalsApiError(404));

    const { result } = await renderStream(ACTIVITY_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('fails, and stops loading, when the call fails', async () => {
    mockGetActivityStreams.mockRejectedValue(new Error('offline'));

    const { result } = await renderStream(ACTIVITY_ID);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(mockGetActivityStreams).toHaveBeenCalledTimes(1);
  });

  it('fetches nothing, and is never loading, without an Activity', async () => {
    const { result } = await renderStream(null);

    expect(result.current.isLoading).toBe(false);
    expect(mockGetActivityStreams).not.toHaveBeenCalled();
  });
});
