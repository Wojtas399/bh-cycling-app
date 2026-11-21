import { useActivityRoute } from '../useActivityRoute';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { IntervalsApiError, getActivityMap } from '@/lib/intervalsApi';
import type { IntervalsActivityMap } from '@/lib/intervalsApi';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { focusManager } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivityMap: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockGetActivityMap = jest.mocked(getActivityMap);

const ACTIVITY_ID = 'i42';
const ROUTE_KEY = ['intervals', 'athlete-1', 'route', ACTIVITY_ID];

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    scope: null,
    loading: false,
    ...overrides,
  });
}

function mockConnected() {
  mockConnection({
    isConnected: true,
    accessToken: 'token-1',
    athleteId: 'athlete-1',
  });
}

const GPS_MAP: IntervalsActivityMap = {
  latlngs: [[52.2, 21.0], null, [52.201, 21.002]],
  bounds: [
    [52.2, 21.0],
    [52.201, 21.002],
  ],
};

function renderRoute(activityId: string | null = ACTIVITY_ID) {
  return renderHookWithClient(() => useActivityRoute(activityId));
}

describe('useActivityRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    mockGetActivityMap.mockResolvedValue(GPS_MAP);
  });

  it('makes no request without an Activity id', async () => {
    mockConnected();

    const { result } = await renderRoute(null);

    expect(result.current.query.isPending).toBe(true);
    expect(mockGetActivityMap).not.toHaveBeenCalled();
  });

  it('makes no request without credentials', async () => {
    mockConnection();

    const { result } = await renderRoute();

    expect(result.current.query.isPending).toBe(true);
    expect(mockGetActivityMap).not.toHaveBeenCalled();
  });

  it("resolves to the Activity's Route", async () => {
    mockConnected();

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toEqual({
      points: [
        [52.2, 21.0],
        [52.201, 21.002],
      ],
      bounds: [
        [52.2, 21.0],
        [52.201, 21.002],
      ],
    });
    expect(mockGetActivityMap).toHaveBeenCalledWith(
      'token-1',
      ACTIVITY_ID,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('resolves to null, not an error, when intervals.icu has no track (404)', async () => {
    mockConnected();
    mockGetActivityMap.mockRejectedValue(new IntervalsApiError(404));

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();
  });

  it('resolves to null when the track has fewer than 2 usable points', async () => {
    mockConnected();
    mockGetActivityMap.mockResolvedValue({ latlngs: [[52.2, 21.0], null] });

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();
  });

  it('is an error for any other failure', async () => {
    mockConnected();
    mockGetActivityMap.mockRejectedValue(new IntervalsApiError(500));

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.error).toMatchObject({ status: 500 });
  });

  it('never refetches a loaded Route on its own, even on foreground', async () => {
    mockConnected();

    const { result, rerender } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await rerender({});

    expect(mockGetActivityMap).toHaveBeenCalledTimes(1);
    focusManager.setFocused(undefined);
  });

  it('refetches only the Route on refetch', async () => {
    mockConnected();

    const { result, client } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const otherKey = intervalsKeys.workout('athlete-1', 7);

    client.setQueryData(otherKey, {});
    const before = client.getQueryState(otherKey)?.dataUpdatedAt;

    await act(() => result.current.refetch());

    expect(mockGetActivityMap).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(before);
  });

  it('refetches a failed Route on refetchIfFailed', async () => {
    mockConnected();
    mockGetActivityMap.mockRejectedValueOnce(new IntervalsApiError(500));

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isError).toBe(true));

    await act(() => result.current.refetchIfFailed());

    expect(mockGetActivityMap).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).not.toBeNull();
  });

  it('does nothing on refetchIfFailed once the Route has loaded', async () => {
    mockConnected();

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    let settled = false;
    const pending = result.current.refetchIfFailed().then(() => {
      settled = true;
    });

    // Resolves immediately: by the next microtask, with no request in flight.
    await Promise.resolve();
    expect(settled).toBe(true);
    await act(() => pending);

    expect(mockGetActivityMap).toHaveBeenCalledTimes(1);
  });

  it('is cleared when Intervals.icu is disconnected', async () => {
    mockConnected();

    const { result, client, rerender } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(client.getQueryData(ROUTE_KEY)).toBeDefined();

    mockConnection();
    await act(() => removeIntervalsQueries(client));
    await rerender({});

    expect(client.getQueryData(ROUTE_KEY)).toBeUndefined();
    expect(result.current.query.data).toBeUndefined();
  });
});
