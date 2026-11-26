import { Alert, type AlertButton } from 'react-native';

import { useHealthDataConsentRecord } from '../useHealthDataConsentRecord';
import { useIntervalsAuth } from '../useIntervalsAuth';
import { useIntervalsConnection } from '../useIntervalsConnection';
import { useIntervalsRead } from '../useIntervalsRead';
import {
  HEALTH_DATA_CONSENT_VERSION,
  PRIVACY_POLICY_URL,
} from '@/constants/legal';
import { setHealthDataConsentWithdrawn } from '@/lib/healthDataConsentWithdrawalStore';
import { IntervalsApiError } from '@/lib/intervalsApi';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '@/lib/intervalsReconnectStore';
import { toast } from '@/lib/toast';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';
import * as AuthSession from 'expo-auth-session';

const mockPromptAsync = jest.fn();
const mockHttpsCallable = jest.fn();

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: mockPromptAsync,
    codeVerifier: 'verifier-xyz',
  })),
  CodeChallengeMethod: { S256: 'S256' },
  ResponseType: { Code: 'code' },
}));

const mockOpenBrowserAsync = jest.fn();

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: (url: string) => mockOpenBrowserAsync(url),
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

jest.mock('../useHealthDataConsentRecord', () => ({
  useHealthDataConsentRecord: jest.fn(),
}));

const INTERVALS_KEY = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];
const ATHLETE_SETTINGS_KEY = ['intervals', 'athlete-1', 'athleteSettings'];
const WELLNESS_KEY = ['intervals', 'athlete-1', 'wellness', '2026-10-11'];
const FITNESS_KEY = ['intervals', 'athlete-1', 'fitness', '2026-10-11'];

function renderAuth() {
  return renderHookWithClient(() => useIntervalsAuth());
}

const mockReadWellness = jest.fn<Promise<number[]>, [accessToken: string]>();

function wellnessQueryOptions(credentials: IntervalsCredentials | null) {
  return queryOptions({
    queryKey: WELLNESS_KEY,
    queryFn: credentials
      ? () => mockReadWellness(credentials.accessToken)
      : skipToken,
  });
}

function renderAuthWithWellness() {
  return renderHookWithClient(() => ({
    auth: useIntervalsAuth(),
    wellness: useIntervalsRead({
      queryOptions: wellnessQueryOptions,
      args: [],
      readsHealthData: true,
    }),
  }));
}

async function confirmDisconnect(
  result: Awaited<ReturnType<typeof renderAuth>>['result'],
) {
  mockAlert.mockClear();

  await act(() => {
    result.current.handleDisconnect();
  });

  const buttons = alertButtons();

  await act(async () => {
    await buttons[1].onPress?.();
  });

  await waitFor(() => expect(result.current.disconnecting).toBe(false));
}

const mockToast = jest.mocked(toast);
const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockUseHealthDataConsentRecord = jest.mocked(useHealthDataConsentRecord);
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function mockGivenConsent() {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: true,
    athleteName: null,
    athleteId: 'athlete-1',
    accessToken: 'token-1',
    scope: 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ',
    loading: false,
  });
  mockUseHealthDataConsentRecord.mockReturnValue({
    loading: false,
    record: { consentVersion: HEALTH_DATA_CONSENT_VERSION },
  });
}

function alertButtons(): AlertButton[] {
  const buttons = mockAlert.mock.calls[0][2];

  if (!buttons) throw new Error('The alert was shown without buttons.');

  return buttons;
}

describe('useIntervalsAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIntervalsConnection.mockReturnValue({
      isConnected: true,
      athleteName: null,
      athleteId: 'athlete-1',
      accessToken: 'token-1',
      scope: null,
      loading: false,
    });
    mockUseHealthDataConsentRecord.mockReturnValue({
      loading: false,
      record: null,
    });
    setNeedsReconnect(false);
    setHealthDataConsentWithdrawn(false);
  });

  describe('handleConnect', () => {
    it('asks a new connection for the connection scopes only, as one comma-separated item, since expo-auth-session joins items with spaces and Intervals.icu wants commas', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ'],
        }),
      );
    });

    it('asks for Wellness access too and keeps the consent when reconnecting with a current consent record, so a reconnect after a 401 keeps Wellness', async () => {
      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockUseHealthDataConsentRecord.mockReturnValue({
        loading: false,
        record: { consentVersion: HEALTH_DATA_CONSENT_VERSION },
      });
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ'],
        }),
      );
      expect(mockExchange).toHaveBeenCalledWith(
        expect.objectContaining({ healthData: { action: 'keep' } }),
      );
    });

    it('authorizes with PKCE over S256, so an app that intercepts the redirect cannot redeem the code', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleConnect();
      });

      expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({ usePKCE: true, codeChallengeMethod: 'S256' }),
      );
    });

    it('exchanges the code together with the PKCE code verifier, keeping the consent, on a successful authorization', async () => {
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
      expect(mockExchange).toHaveBeenCalledWith({
        code: 'auth-code',
        codeVerifier: 'verifier-xyz',
        healthData: { action: 'keep' },
      });
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

  describe('handleGrantHealthDataConsent', () => {
    it('authorizes again with Wellness access and grants the consent to the current version with the age statement', async () => {
      const mockExchange = jest.fn().mockResolvedValue({ data: {} });

      mockHttpsCallable.mockReturnValue(mockExchange);
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleGrantHealthDataConsent();
      });

      expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ'],
          usePKCE: true,
        }),
      );
      expect(mockHttpsCallable).toHaveBeenCalledWith('exchangeIntervalsToken');
      expect(mockExchange).toHaveBeenCalledWith({
        code: 'auth-code',
        codeVerifier: 'verifier-xyz',
        healthData: {
          action: 'grant',
          consentVersion: HEALTH_DATA_CONSENT_VERSION,
          ageConfirmed: true,
        },
      });
    });

    it("refetches the athlete's Intervals data once the grant succeeds, so Wellness shows on return", async () => {
      mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      const { result, client } = await renderAuth();

      client.setQueryData(INTERVALS_KEY, []);

      await act(async () => {
        result.current.handleGrantHealthDataConsent();
      });

      expect(client.getQueryState(INTERVALS_KEY)?.isInvalidated).toBe(true);
    });

    it('tells the athlete the consent was not given when they unticked Wellness on the Intervals.icu page', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockResolvedValue({
          data: {
            athleteId: 'athlete-1',
            athleteName: 'Jane Rider',
            healthDataConsentGiven: false,
          },
        }),
      );
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleGrantHealthDataConsent();
      });

      await waitFor(() =>
        expect(mockToast.warning).toHaveBeenCalledWith(
          'intervals.healthDataConsentNotGiven',
        ),
      );
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('says Intervals.icu connected once the grant comes back with Wellness access', async () => {
      mockHttpsCallable.mockReturnValue(
        jest.fn().mockResolvedValue({
          data: {
            athleteId: 'athlete-1',
            athleteName: 'Jane Rider',
            healthDataConsentGiven: true,
          },
        }),
      );
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleGrantHealthDataConsent();
      });

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith('intervals.connected'),
      );
      expect(mockToast.warning).not.toHaveBeenCalled();
    });

    it('grants nothing when the athlete cancels on the Intervals.icu page', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = await renderAuth();

      await act(async () => {
        result.current.handleGrantHealthDataConsent();
      });

      expect(mockHttpsCallable).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(result.current.connecting).toBe(false);
    });
  });

  describe('handleHealthDataConsentSwitch', () => {
    describe('turned on', () => {
      it('asks for the consent with the age statement first, and grants it with Wellness access once the athlete agrees', async () => {
        const mockExchange = jest.fn().mockResolvedValue({ data: {} });

        mockHttpsCallable.mockReturnValue(mockExchange);
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });

        const { result } = await renderAuth();

        await act(() => {
          result.current.handleHealthDataConsentSwitch(true);
        });

        expect(mockAlert).toHaveBeenCalledWith(
          'intervals.healthDataConsentPrompt.title',
          expect.stringContaining(
            'intervals.healthDataConsentPrompt.whatWeRead',
          ),
          expect.any(Array),
        );
        expect(AuthSession.AuthRequest).not.toHaveBeenCalled();

        const agree = alertButtons().find(
          ({ text }) => text === 'intervals.healthDataConsentSwitch.agree',
        );

        await act(async () => {
          await agree?.onPress?.();
        });

        expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ'],
          }),
        );
        expect(mockExchange).toHaveBeenCalledWith({
          code: 'auth-code',
          codeVerifier: 'verifier-xyz',
          healthData: {
            action: 'grant',
            consentVersion: HEALTH_DATA_CONSENT_VERSION,
            ageConfirmed: true,
          },
        });
      });

      it('asks for the consent again once the athlete comes back from the privacy policy, so agreeing then still grants it', async () => {
        const mockExchange = jest.fn().mockResolvedValue({ data: {} });

        mockHttpsCallable.mockReturnValue(mockExchange);
        mockOpenBrowserAsync.mockResolvedValue({ type: 'cancel' });
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });

        const { result } = await renderAuth();

        await act(() => {
          result.current.handleHealthDataConsentSwitch(true);
        });

        const privacyPolicy = alertButtons().find(
          ({ text }) =>
            text === 'intervals.healthDataConsentPrompt.privacyPolicy',
        );

        mockAlert.mockClear();

        await act(async () => {
          await privacyPolicy?.onPress?.();
        });

        expect(mockOpenBrowserAsync).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
        expect(mockAlert).toHaveBeenCalledWith(
          'intervals.healthDataConsentPrompt.title',
          expect.any(String),
          expect.any(Array),
        );

        const agree = alertButtons().find(
          ({ text }) => text === 'intervals.healthDataConsentSwitch.agree',
        );

        await act(async () => {
          await agree?.onPress?.();
        });

        expect(mockExchange).toHaveBeenCalledWith(
          expect.objectContaining({
            healthData: expect.objectContaining({ action: 'grant' }),
          }),
        );
      });

      it('asks for the consent again even when the privacy policy fails to open', async () => {
        mockOpenBrowserAsync.mockRejectedValue(new Error('no browser'));

        const { result } = await renderAuth();

        await act(() => {
          result.current.handleHealthDataConsentSwitch(true);
        });

        const privacyPolicy = alertButtons().find(
          ({ text }) =>
            text === 'intervals.healthDataConsentPrompt.privacyPolicy',
        );

        mockAlert.mockClear();

        await act(async () => {
          await privacyPolicy?.onPress?.();
        });

        expect(mockAlert).toHaveBeenCalledWith(
          'intervals.healthDataConsentPrompt.title',
          expect.any(String),
          expect.any(Array),
        );
      });

      it('grants nothing when the athlete cancels the consent dialog', async () => {
        const { result } = await renderAuth();

        await act(() => {
          result.current.handleHealthDataConsentSwitch(true);
        });

        const cancel = alertButtons().find(({ style }) => style === 'cancel');

        expect(cancel?.onPress).toBeUndefined();
        expect(AuthSession.AuthRequest).not.toHaveBeenCalled();
      });

      it('only authorizes again, keeping the consent, when a current consent lacks Wellness access on Intervals.icu', async () => {
        const mockExchange = jest.fn().mockResolvedValue({ data: {} });

        mockHttpsCallable.mockReturnValue(mockExchange);
        mockGivenConsent();
        mockUseIntervalsConnection.mockReturnValue({
          isConnected: true,
          athleteName: null,
          athleteId: 'athlete-1',
          accessToken: 'token-1',
          scope: 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ',
          loading: false,
        });
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });

        const { result } = await renderAuth();

        await act(async () => {
          result.current.handleHealthDataConsentSwitch(true);
        });

        expect(mockAlert).not.toHaveBeenCalled();
        expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ,WELLNESS:READ'],
          }),
        );
        expect(mockExchange).toHaveBeenCalledWith(
          expect.objectContaining({ healthData: { action: 'keep' } }),
        );
      });
    });

    describe('turned off', () => {
      it('authorizes again without Wellness access and withdraws the consent', async () => {
        const mockExchange = jest.fn().mockResolvedValue({ data: {} });

        mockHttpsCallable.mockReturnValue(mockExchange);
        mockGivenConsent();
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });

        const { result } = await renderAuth();

        await act(async () => {
          result.current.handleHealthDataConsentSwitch(false);
        });

        expect(AuthSession.AuthRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            scopes: ['ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ'],
            usePKCE: true,
          }),
        );
        expect(mockExchange).toHaveBeenCalledWith({
          code: 'auth-code',
          codeVerifier: 'verifier-xyz',
          healthData: { action: 'withdraw' },
        });
      });

      it('drops the cached Wellness and Fitness once the withdraw succeeds, and keeps the rest of the Intervals data', async () => {
        mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
        mockGivenConsent();
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });
        const { result, client } = await renderAuth();

        client.setQueryData(INTERVALS_KEY, []);
        client.setQueryData(WELLNESS_KEY, { fitness: null, wellness: [] });
        client.setQueryData(FITNESS_KEY, []);

        await act(async () => {
          result.current.handleHealthDataConsentSwitch(false);
        });

        await waitFor(() =>
          expect(client.getQueryData(WELLNESS_KEY)).toBeUndefined(),
        );
        expect(client.getQueryData(FITNESS_KEY)).toBeUndefined();
        expect(client.getQueryData(INTERVALS_KEY)).toEqual([]);
      });

      it('asks for the consent at once once the withdraw succeeds, before Firestore drops the consent record, rather than asking to authorize again', async () => {
        mockHttpsCallable.mockReturnValue(
          jest.fn().mockResolvedValue({
            data: { healthDataConsentGiven: false },
          }),
        );
        mockGivenConsent();
        mockReadWellness.mockResolvedValue([42]);
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });
        const { result } = await renderAuthWithWellness();

        await settleQueries();
        expect(mockReadWellness).toHaveBeenCalledTimes(1);
        mockReadWellness.mockRejectedValue(new IntervalsApiError(403));

        await act(async () => {
          result.current.auth.handleHealthDataConsentSwitch(false);
        });
        await settleQueries();

        expect(result.current.wellness.healthDataConsentPrompt).toBe(
          'needsConsent',
        );
        expect(result.current.auth.healthDataConsentGiven).toBe(false);
        expect(mockReadWellness).toHaveBeenCalledTimes(1);
      });

      it('asks for the consent, not to authorize again, when the new scope reaches the device before the dropped consent record does', async () => {
        mockHttpsCallable.mockReturnValue(
          jest.fn().mockResolvedValue({
            data: { healthDataConsentGiven: false },
          }),
        );
        mockGivenConsent();
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });
        const { result, rerender } = await renderAuthWithWellness();

        await act(async () => {
          result.current.auth.handleHealthDataConsentSwitch(false);
        });
        mockUseIntervalsConnection.mockReturnValue({
          isConnected: true,
          athleteName: null,
          athleteId: 'athlete-1',
          accessToken: 'token-1',
          scope: 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ',
          loading: false,
        });
        await rerender({});

        expect(result.current.wellness.healthDataConsentPrompt).toBe(
          'needsConsent',
        );
      });

      it('reads Wellness again once the athlete gives the consent after withdrawing it', async () => {
        mockGivenConsent();
        mockReadWellness.mockResolvedValue([42]);
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });
        mockHttpsCallable.mockReturnValue(
          jest.fn().mockResolvedValue({
            data: { healthDataConsentGiven: false },
          }),
        );
        const { result } = await renderAuthWithWellness();

        await act(async () => {
          result.current.auth.handleHealthDataConsentSwitch(false);
        });
        await settleQueries();

        mockHttpsCallable.mockReturnValue(
          jest.fn().mockResolvedValue({
            data: { healthDataConsentGiven: true },
          }),
        );

        await act(async () => {
          result.current.auth.handleGrantHealthDataConsent();
        });

        await waitFor(() =>
          expect(result.current.auth.healthDataConsentGiven).toBe(true),
        );
        expect(result.current.wellness.healthDataConsentPrompt).toBeNull();
      });

      it('says the consent was withdrawn once the withdraw succeeds, not that Intervals.icu connected', async () => {
        mockHttpsCallable.mockReturnValue(jest.fn().mockResolvedValue({}));
        mockGivenConsent();
        mockPromptAsync.mockResolvedValue({
          type: 'success',
          params: { code: 'auth-code' },
        });
        const { result } = await renderAuth();

        await act(async () => {
          result.current.handleHealthDataConsentSwitch(false);
        });

        await waitFor(() =>
          expect(mockToast.success).toHaveBeenCalledWith(
            'intervals.healthDataConsentSwitch.withdrawn',
          ),
        );
        expect(mockToast.success).toHaveBeenCalledTimes(1);
      });

      it('changes nothing when the athlete cancels on the Intervals.icu page, so the consent and its data stay', async () => {
        mockGivenConsent();
        mockPromptAsync.mockResolvedValue({ type: 'cancel' });
        const { result, client } = await renderAuth();

        client.setQueryData(WELLNESS_KEY, { fitness: null, wellness: [] });
        client.setQueryData(FITNESS_KEY, []);

        await act(async () => {
          result.current.handleHealthDataConsentSwitch(false);
        });

        expect(mockHttpsCallable).not.toHaveBeenCalled();
        expect(client.getQueryData(WELLNESS_KEY)).toEqual({
          fitness: null,
          wellness: [],
        });
        expect(client.getQueryData(FITNESS_KEY)).toEqual([]);
        expect(client.getQueryState(WELLNESS_KEY)?.isInvalidated).toBe(false);
        expect(mockToast.success).not.toHaveBeenCalled();
        expect(result.current.healthDataConsentGiven).toBe(true);
      });
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

      const buttons = alertButtons();
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

      const buttons = alertButtons();
      const cancelButton = buttons[0];

      expect(cancelButton.onPress).toBeUndefined();
      expect(mockHttpsCallable).not.toHaveBeenCalled();
    });
  });
});
