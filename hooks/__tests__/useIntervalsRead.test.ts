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
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

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

function selectedRideDatesQueryOptions(
  credentials: IntervalsCredentials | null,
  rideId: number,
  select: (stored: string[]) => Set<string>,
) {
  return queryOptions({
    ...rideDatesQueryOptions(credentials, rideId),
    select,
  });
}

function rideDatesUpTo(stored: string[], today: string): Set<string> {
  return new Set(stored.filter(date => date <= today));
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

  describe('Health Data Consent gate', () => {
    const SCOPE_WITHOUT_WELLNESS = 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ';

    function renderHealthDataRead() {
      return renderHookWithClient(() =>
        useIntervalsRead({
          queryOptions: rideDatesQueryOptions,
          args: [7],
          readsHealthData: true,
        }),
      );
    }

    it('requests nothing and prompts for the consent without a consent record, even with Wellness access granted', async () => {
      connectIntervals({ healthDataConsent: null });

      const { result } = await renderHealthDataRead();

      await settleQueries();

      expect(result.current.healthDataConsentPrompt).toBe('needsConsent');
      expect(result.current.availability).toBe('available');
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests nothing and prompts for the consent with a record for an older consent version', async () => {
      connectIntervals({ healthDataConsent: { consentVersion: 0 } });

      const { result } = await renderHealthDataRead();

      await settleQueries();

      expect(result.current.healthDataConsentPrompt).toBe('needsConsent');
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests nothing and prompts only to authorize again with a current record but no Wellness access', async () => {
      connectIntervals({ scope: SCOPE_WITHOUT_WELLNESS });

      const { result } = await renderHealthDataRead();

      await settleQueries();

      expect(result.current.healthDataConsentPrompt).toBe(
        'needsReauthorization',
      );
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it("requests the read with the athlete's token and prompts nothing once the consent is given", async () => {
      connectIntervals();

      const { result } = await renderHealthDataRead();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.healthDataConsentPrompt).toBeNull();
      expect(fetchRideDates).toHaveBeenCalledWith('token-1', 7);
    });

    it('requests nothing and prompts nothing while the consent record loads', async () => {
      connectIntervals({ healthDataConsent: 'loading' });

      const { result } = await renderHealthDataRead();

      await settleQueries();

      expect(result.current.healthDataConsentPrompt).toBeNull();
      expect(result.current.query.isPending).toBe(true);
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests nothing and prompts nothing while the connection resolves', async () => {
      intervalsConnectionLoading();

      const { result } = await renderHealthDataRead();

      await settleQueries();

      expect(result.current.healthDataConsentPrompt).toBeNull();
      expect(result.current.availability).toBe('loading');
      expect(fetchRideDates).not.toHaveBeenCalled();
    });

    it('requests a read that reads no health data and prompts nothing, whatever the consent', async () => {
      connectIntervals({ scope: 'ACTIVITY:READ', healthDataConsent: null });

      const { result } = await renderRideDates();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.healthDataConsentPrompt).toBeNull();
      expect(fetchRideDates).toHaveBeenCalledWith('token-1', 7);
    });
  });

  describe('refetch', () => {
    it('refetches the read under exactly its key, and no query under a longer one', async () => {
      connectIntervals();
      const fetchLonger = jest.fn().mockResolvedValue('longer');
      const { result } = await renderHookWithClient(() => {
        useQuery({
          queryKey: ['intervals', 'athlete-1', 'rideDates', 7, 'longer'],
          queryFn: fetchLonger,
        });

        return useIntervalsRead({
          queryOptions: rideDatesQueryOptions,
          args: [7],
        });
      });

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      await act(() => result.current.refetch());

      expect(fetchRideDates).toHaveBeenCalledTimes(2);
      expect(fetchLonger).toHaveBeenCalledTimes(1);
    });

    it('keeps the same function across renders while the key is equal', async () => {
      connectIntervals();
      const { result, rerender } = await renderRideDates();
      const first = result.current.refetch;

      await rerender(undefined);

      expect(result.current.refetch).toBe(first);
    });

    it('returns a new function once the key changes', async () => {
      connectIntervals();
      let rideId = 7;
      const { result, rerender } = await renderHookWithClient(() =>
        useIntervalsRead({
          queryOptions: rideDatesQueryOptions,
          args: [rideId],
        }),
      );
      const first = result.current.refetch;

      rideId = 8;
      await rerender(undefined);

      expect(result.current.refetch).not.toBe(first);
    });
  });

  describe('select', () => {
    function renderSelected(today: () => string) {
      return renderHookWithClient(() =>
        useIntervalsRead({
          queryOptions: selectedRideDatesQueryOptions,
          args: [7],
          select: rideDatesUpTo,
          selectArgs: [today()],
        }),
      );
    }

    it('selects from the stored data with its selectArgs', async () => {
      connectIntervals();

      const { result } = await renderSelected(() => '2026-11-21');

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data).toEqual(new Set(['2026-11-20']));
    });

    it('keeps the same selected data across renders while the selectArgs are equal', async () => {
      connectIntervals();
      let today = '2026-11-21';
      const { result, rerender } = await renderSelected(() => today);

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      const first = result.current.query.data;

      today = '2026-11-21';
      await rerender(undefined);

      expect(result.current.query.data).toBe(first);
    });

    it('selects again once a selectArg changes', async () => {
      connectIntervals();
      let today = '2026-11-21';
      const { result, rerender } = await renderSelected(() => today);

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      today = '2026-11-22';
      await rerender(undefined);

      expect(result.current.query.data).toEqual(
        new Set(['2026-11-20', '2026-11-22']),
      );
    });
  });
});
