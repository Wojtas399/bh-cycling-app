import { Alert } from 'react-native';

import { useIntervalsAuth } from '../useIntervalsAuth';
import { useIntervalsConnection } from '../useIntervalsConnection';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

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

jest.mock('../useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(() => ({ isConnected: true })),
}));

const INTERVALS_KEY = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];

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

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useIntervalsAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIntervalsConnection.mockReturnValue({ isConnected: true });
    setNeedsReconnect(false);
  });

  describe('handleConnect', () => {
    it('exchanges the code and clears error on a successful authorization', async () => {
      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith('exchangeIntervalsToken');
      expect(mockExchange).toHaveBeenCalledWith({ code: 'auth-code' });
      expect(result.current.error).toBe('');
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
        await result.current.handleConnect();
      });

      expect(getNeedsReconnect()).toBe(false);
    });

    it('sets an error when the Cloud Function exchange fails', async () => {
      const mockExchange = jest.fn().mockRejectedValue(new Error('boom'));

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        await result.current.handleConnect();
      });

      await waitFor(() =>
        expect(result.current.error).toBe('intervals.errors.exchangeFailed'),
      );
      expect(result.current.connecting).toBe(false);
    });

    it('resolves with no error and skips the exchange when the prompt is dismissed', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(result.current.error).toBe('');
      expect(result.current.connecting).toBe(false);
    });

    it('does nothing when the user denies access', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'error',
        params: { error: 'access_denied' },
        error: { code: 'access_denied' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(result.current.error).toBe('');
      expect(result.current.connecting).toBe(false);
    });

    it('clears the disconnect error when a connect starts', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('boom')),
      );

      const { result } = await renderAuth();

      await confirmDisconnect(result);

      await waitFor(() =>
        expect(result.current.error).toBe('intervals.errors.disconnectFailed'),
      );

      mockPromptAsync.mockResolvedValue({ type: 'dismiss' });

      await act(async () => {
        await result.current.handleConnect();
      });

      await waitFor(() => expect(result.current.error).toBe(''));
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

    it('drops the cached Intervals data once the disconnect succeeds', async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);

      await confirmDisconnect(result);

      await waitFor(() =>
        expect(client.getQueryData(INTERVALS_KEY)).toBeUndefined(),
      );
    });

    it('keeps the cached Intervals data when the disconnect fails', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('boom')),
      );
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);

      await confirmDisconnect(result);

      await waitFor(() =>
        expect(result.current.error).toBe('intervals.errors.disconnectFailed'),
      );
      expect(client.getQueryData(INTERVALS_KEY)).toEqual([]);
    });

    it('clears the connect error when a disconnect starts', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('boom')),
      );
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        await result.current.handleConnect();
      });

      await waitFor(() =>
        expect(result.current.error).toBe('intervals.errors.exchangeFailed'),
      );

      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));

      await confirmDisconnect(result);

      await waitFor(() => expect(result.current.error).toBe(''));
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
