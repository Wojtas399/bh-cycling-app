import {
  connectIntervals,
  disconnectIntervals,
} from '@/test-utils/intervalsConnection';

import { useActivityRoute } from '../useActivityRoute';
import { IntervalsApiError, getActivityMap } from '@/lib/intervalsApi';
import type { IntervalsActivityMap } from '@/lib/intervalsApi';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { restoreDefaultFocus } from '@/test-utils/focus';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { focusManager } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivityMap: jest.fn(),
}));

const mockGetActivityMap = jest.mocked(getActivityMap);

const ACTIVITY_ID = 'i42';
const ROUTE_KEY = ['intervals', 'athlete-1', 'route', ACTIVITY_ID];

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
    connectIntervals();

    const { result } = await renderRoute(null);

    expect(result.current.query.isPending).toBe(true);
    expect(mockGetActivityMap).not.toHaveBeenCalled();
  });

  it('makes no request without credentials', async () => {
    disconnectIntervals();

    const { result } = await renderRoute();

    expect(result.current.query.isPending).toBe(true);
    expect(mockGetActivityMap).not.toHaveBeenCalled();
  });

  it("resolves to the Activity's Route", async () => {
    connectIntervals();

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
    connectIntervals();
    mockGetActivityMap.mockRejectedValue(new IntervalsApiError(404));

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();
  });

  it('resolves to null when the track has fewer than 2 usable points', async () => {
    connectIntervals();
    mockGetActivityMap.mockResolvedValue({ latlngs: [[52.2, 21.0], null] });

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();
  });

  it('is an error for any other failure', async () => {
    connectIntervals();
    mockGetActivityMap.mockRejectedValue(new IntervalsApiError(500));

    const { result } = await renderRoute();

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.query.error).toMatchObject({ status: 500 });
  });

  it('never refetches a loaded Route on its own, even on foreground', async () => {
    connectIntervals();

    const { result, rerender } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await rerender({});

    expect(mockGetActivityMap).toHaveBeenCalledTimes(1);
    restoreDefaultFocus();
  });

  it('refetches only the Route on refetch', async () => {
    connectIntervals();

    const { result, client } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    const otherKey = intervalsKeys.workout('athlete-1', 7);

    client.setQueryData(otherKey, {});
    const before = client.getQueryState(otherKey)?.dataUpdatedAt;

    await act(() => result.current.refetch());

    expect(mockGetActivityMap).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(before);
  });

  it('is cleared when Intervals.icu is disconnected', async () => {
    connectIntervals();

    const { result, client, rerender } = await renderRoute();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(client.getQueryData(ROUTE_KEY)).toBeDefined();

    disconnectIntervals();
    await act(() => removeIntervalsQueries(client));
    await rerender({});

    expect(client.getQueryData(ROUTE_KEY)).toBeUndefined();
    expect(result.current.query.data).toBeUndefined();
  });
});
