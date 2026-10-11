import { Alert } from 'react-native';

import { useIntervalsAuth } from '../useIntervalsAuth';
import { useIntervalsConnection } from '../useIntervalsConnection';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '@/lib/intervalsReconnectStore';
import { queryClient } from '@/lib/queryClient';
import { act, renderHook } from '@testing-library/react-native';

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

async function confirmDisconnect() {
  const { result } = await renderHook(() => useIntervalsAuth());

  await act(() => {
    result.current.handleDisconnect();
  });

  const buttons = mockAlert.mock.calls[0][2] as {
    onPress?: () => void | Promise<void>;
  }[];

  await act(async () => {
    await buttons[1].onPress?.();
  });

  return result;
}

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useIntervalsAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIntervalsConnection.mockReturnValue({ isConnected: true });
    setNeedsReconnect(false);
    queryClient.clear();
  });

  describe('handleConnect', () => {
    it('exchanges the code and clears error on a successful authorization', async () => {
      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderHook(() => useIntervalsAuth());

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

      const { result } = await renderHook(() => useIntervalsAuth());

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

      const { result } = await renderHook(() => useIntervalsAuth());

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(result.current.error).toBe('intervals.errors.exchangeFailed');
      expect(result.current.connecting).toBe(false);
    });

    it('does nothing when the user cancels the browser', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderHook(() => useIntervalsAuth());

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

      const { result } = await renderHook(() => useIntervalsAuth());

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(result.current.error).toBe('');
      expect(result.current.connecting).toBe(false);
    });
  });

  describe('handleDisconnect', () => {
    it('shows a confirmation dialog and disconnects on confirm', async () => {
      const mockDisconnect = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockDisconnect);

      const { result } = await renderHook(() => useIntervalsAuth());

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

      expect(mockHttpsCallable).toHaveBeenCalledWith('disconnectIntervals');
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('drops the cached Intervals data once the disconnect succeeds', async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      queryClient.setQueryData(INTERVALS_KEY, []);

      await confirmDisconnect();

      expect(queryClient.getQueryData(INTERVALS_KEY)).toBeUndefined();
    });

    it('keeps the cached Intervals data when the disconnect fails', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('boom')),
      );
      queryClient.setQueryData(INTERVALS_KEY, []);

      const result = await confirmDisconnect();

      expect(queryClient.getQueryData(INTERVALS_KEY)).toEqual([]);
      expect(result.current.error).toBe('intervals.errors.disconnectFailed');
    });

    it('does nothing when the user cancels the confirmation', async () => {
      const { result } = await renderHook(() => useIntervalsAuth());

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
