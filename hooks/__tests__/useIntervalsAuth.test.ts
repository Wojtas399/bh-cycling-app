import { Alert } from 'react-native';

import { useIntervalsAuth } from '../useIntervalsAuth';
import { useIntervalsConnection } from '../useIntervalsConnection';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '@/lib/intervalsReconnectStore';
import { toast } from '@/lib/toast';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';
import * as AuthSession from 'expo-auth-session';

const mockPromptAsync = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: mockPromptAsync,
  })),
  ResponseType: { Code: 'code' },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: (_ns?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      options?.keyPrefix ? `${options.keyPrefix}.${key}` : key,
  }),
}));

jest.mock('@/lib/firebase', () => ({
  functions: () => ({ httpsCallable: mockHttpsCallable }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock('../useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(() => ({ isConnected: true })),
}));

const INTERVALS_KEY = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];
const ATHLETE_SETTINGS_KEY = ['intervals', 'athlete-1', 'athleteSettings'];

function renderAuth() {
  return renderHookWithClient(() => useIntervalsAuth());
}

async function confirmDisconnect(
  result: Awaited<ReturnType<typeof renderAuth>>['result'],
) {
  mockAlert.mockClear();

  await act(() => {
    result.current.handleDisconnect();
  });

  const buttons = mockAlert.mock.calls[0][2] as {
    onPress?: () => void | Promise<void>;
  }[];

  await act(async () => {
    await buttons[1].onPress?.();
  });

  await waitFor(() => expect(result.current.disconnecting).toBe(false));
}

const mockToast = jest.mocked(toast);
const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useIntervalsAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIntervalsConnection.mockReturnValue({ isConnected: true });
    setNeedsReconnect(false);
  });

  describe('handleConnect', () => {
    it('asks for all four scopes as one comma-separated item, since expo-auth-session joins items with spaces and Intervals.icu wants commas', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ,SETTINGS:READ'],
        }),
      );
    });

    it('exchanges the code on a successful authorization', async () => {
      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith('exchangeIntervalsToken');
      expect(mockExchange).toHaveBeenCalledWith({ code: 'auth-code' });
      expect(result.current.connecting).toBe(false);
    });

    it('clears the needs-reconnect flag on a successful authorization', async () => {
      setNeedsReconnect(true);

      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(getNeedsReconnect()).toBe(false);
    });

    it("invalidates the athlete's Intervals data on a successful authorization, settings included, which never go stale on their own", async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);
      client.setQueryData(ATHLETE_SETTINGS_KEY, {});

      await act(async () => {
        result.current.handleConnect();
      });

      expect(client.getQueryState(INTERVALS_KEY)?.isInvalidated).toBe(true);
      expect(client.getQueryState(ATHLETE_SETTINGS_KEY)?.isInvalidated).toBe(
        true,
      );
    });

    it('invalidates Intervals data under any athlete id, since the new connection may not carry one yet', async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      const { result, client } = await renderAuth();
      const otherAthleteKey = ['intervals', 'athlete-2', 'athleteSettings'];

      client.setQueryData(otherAthleteKey, {});

      await act(async () => {
        result.current.handleConnect();
      });

      expect(client.getQueryState(otherAthleteKey)?.isInvalidated).toBe(true);
    });

    it('re-enables the gated Intervals queries before invalidating them, so they refetch under the new consent', async () => {
      setNeedsReconnect(true);
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      const { result, client } = await renderAuth();
      const needsReconnectAtInvalidation: boolean[] = [];

      client.setQueryData(INTERVALS_KEY, []);
      client.getQueryCache().subscribe(event => {
        if (event.type === 'updated' && event.action.type === 'invalidate') {
          needsReconnectAtInvalidation.push(getNeedsReconnect());
        }
      });

      await act(async () => {
        result.current.handleConnect();
      });

      await waitFor(() =>
        expect(needsReconnectAtInvalidation).toEqual([false]),
      );
    });

    it('shows a success toast once the exchange succeeds', async () => {
      setNeedsReconnect(true);
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(mockToast.success).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith('intervals.connected');
      expect(getNeedsReconnect()).toBe(false);
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('shows an error toast when the Cloud Function exchange fails', async () => {
      const mockExchange = jest.fn().mockRejectedValue(new Error('boom'));

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          'intervals.errors.exchangeFailed',
        ),
      );
      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(result.current.connecting).toBe(false);
    });

    it('skips the exchange and shows no toast when the prompt is dismissed', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(result.current.connecting).toBe(false);
    });

    it('skips the exchange and shows no toast when the user denies access', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'error',
        params: { error: 'access_denied' },
        error: { code: 'access_denied' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(result.current.connecting).toBe(false);
    });
  });

  describe('handleDisconnect', () => {
    it('shows a confirmation dialog and disconnects on confirm', async () => {
      const mockDisconnect = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockDisconnect);

      const { result } = await renderAuth();

      await act(() => {
        result.current.handleDisconnect();
      });

      expect(mockAlert).toHaveBeenCalledTimes(1);

      const buttons = mockAlert.mock.calls[0][2] as {
        text: string;
        onPress?: () => void | Promise<void>;
      }[];
      const confirmButton = buttons[1];

      await act(async () => {
        await confirmButton.onPress?.();
      });

      await waitFor(() => expect(mockDisconnect).toHaveBeenCalled());
      expect(mockHttpsCallable).toHaveBeenCalledWith('disconnectIntervals');
    });

    it('drops the cached Intervals data and shows no toast once the disconnect succeeds, so reconnecting the same athlete shows none of it', async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);

      await confirmDisconnect(result);

      await waitFor(() =>
        expect(client.getQueryData(INTERVALS_KEY)).toBeUndefined(),
      );
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('shows an error toast and keeps the cached Intervals data when the disconnect fails', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('boom')),
      );
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);

      await confirmDisconnect(result);

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          'intervals.errors.disconnectFailed',
        ),
      );
      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(INTERVALS_KEY)).toEqual([]);
    });

    it('does nothing when the user cancels the confirmation', async () => {
      const { result } = await renderAuth();

      await act(() => {
        result.current.handleDisconnect();
      });

      const buttons = mockAlert.mock.calls[0][2] as {
        text: string;
        onPress?: () => void | Promise<void>;
      }[];
      const cancelButton = buttons[0];

      expect(cancelButton.onPress).toBeUndefined();
      expect(mockHttpsCallable).not.toHaveBeenCalled();
    });
  });
});
