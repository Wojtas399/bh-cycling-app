import {
  connectIntervals,
  disconnectIntervals,
  intervalsConnectionLoading,
} from '@/test-utils/intervalsConnection';

import { useIntervalsRead } from '../useIntervalsRead';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react-native';

const fetchRideDates = jest.fn<
  Promise<string[]>,
  [accessToken: string, rideId: number]
>();

function rideDatesQueryOptions(
  credentials: IntervalsCredentials | null,
  rideId: number,
) {
  return queryOptions({
    queryKey: [
      'intervals',
      credentials?.athleteId,
      'rideDates',
      rideId,
    ] as const,
    queryFn: credentials
      ? () => fetchRideDates(credentials.accessToken, rideId)
      : skipToken,
  });
}

describe('useIntervalsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    fetchRideDates.mockResolvedValue(['2026-11-20', '2026-11-22']);
  });

  function renderRideDates(rideId = 7) {
    return renderHookWithClient(() =>
      useIntervalsRead({ queryOptions: rideDatesQueryOptions, args: [rideId] }),
    );
  }

  describe('credentials gate', () => {
    it('requests nothing and is loading while the connection resolves', async () => {
      intervalsConnectionLoading();

      const { result } = await renderRideDates();

      await settleQueries();

      expect(result.current.availability).toBe('loading');
      expect(result.current.query.isPending).toBe(true);
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests nothing and is unavailable when not connected', async () => {
      disconnectIntervals();

      const { result } = await renderRideDates();

      await settleQueries();

      expect(result.current.availability).toBe('unavailable');
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests nothing and is unavailable while a reconnect is needed', async () => {
      connectIntervals();
      setNeedsReconnect(true);

      const { result } = await renderRideDates();

      await settleQueries();

      expect(result.current.availability).toBe('unavailable');
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it("requests the read with the athlete's token once connected, and is available", async () => {
      connectIntervals();

      const { result } = await renderRideDates();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.availability).toBe('available');
      expect(fetchRideDates).toHaveBeenCalledWith('token-1', 7);
      expect(result.current.query.data).toEqual(['2026-11-20', '2026-11-22']);
    });
  });
});
