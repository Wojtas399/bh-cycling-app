import { Alert } from 'react-native';

import { useIntervalsAuth } from '../useIntervalsAuth';
import { useIntervalsConnection } from '../useIntervalsConnection';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '@/lib/intervalsReconnectStore';
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
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/firebase', () => ({
  functions: () => ({ httpsCallable: mockHttpsCallable }),
}));

jest.mock('../useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(() => ({ isConnected: true })),
}));

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

      const { result } = await renderHook(() => useIntervalsAuth());

      await act(async () => {
        await result.current.handleConnect();
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith('exchangeIntervalsToken');
      expect(mockExchange).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'auth-code' }),
      );
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
