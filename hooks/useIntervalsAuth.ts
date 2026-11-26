import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { IntervalsAuthorization } from './healthDataConsent';
import {
  type IntervalsAuthMutation,
  mapIntervalsAuthError,
} from './intervalsAuthErrors';
import { asOneCommaSeparatedScope } from './intervalsScopes';
import { useHealthDataConsent } from './useHealthDataConsent';
import { useIntervalsConnection } from './useIntervalsConnection';
import { functions } from '@/lib/firebase';
import {
  intervalsKeys,
  removeHealthDataQueries,
  removeIntervalsQueries,
} from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { toast } from '@/lib/toast';
import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const AUTHORIZATION_ENDPOINT = 'https://intervals.icu/oauth/authorize';
const REDIRECT_URI = 'blackhorsecyclingapp://oauth/intervals';

export interface UseIntervalsAuthResult {
  handleConnect: () => void;
  handleGrantHealthDataConsent: () => void;
  handleHealthDataConsentSwitch: (on: boolean) => void;
  handleDisconnect: () => void;
  connecting: boolean;
  disconnecting: boolean;
}

function refetchIntervalsUnderNewConsent(queryClient: QueryClient) {
  setNeedsReconnect(false);
  void queryClient.invalidateQueries({ queryKey: intervalsKeys.all });
}

export function useIntervalsAuth(): UseIntervalsAuthResult {
  const { t } = useTranslation(undefined, { keyPrefix: 'intervals' });
  const connection = useIntervalsConnection();
  const consent = useHealthDataConsent();
  const queryClient = useQueryClient();

  const connect = useMutation({
    mutationFn: async ({
      scopes,
      healthData,
    }: IntervalsAuthorization): Promise<'connected' | 'cancelled'> => {
      const clientId = process.env.EXPO_PUBLIC_INTERVALS_CLIENT_ID ?? '';
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: asOneCommaSeparatedScope(scopes),
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: AUTHORIZATION_ENDPOINT,
      });

      if (result.type !== 'success' || !result.params.code) {
        return 'cancelled';
      }

      const exchangeIntervalsToken = functions().httpsCallable(
        'exchangeIntervalsToken',
      );

      await exchangeIntervalsToken({
        code: result.params.code,
        codeVerifier: request.codeVerifier,
        healthData,
      });

      return 'connected';
    },
    onSuccess: async (outcome, { healthData }) => {
      if (outcome === 'cancelled') return;

      if (healthData.action === 'withdraw') {
        await removeHealthDataQueries(queryClient);
      }

      refetchIntervalsUnderNewConsent(queryClient);
      toast.success(t('connected'));
    },
    onError: () => toast.error(errorMessage('connect')),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const disconnectIntervals = functions().httpsCallable(
        'disconnectIntervals',
      );

      await disconnectIntervals();
    },
    onSuccess: () => removeIntervalsQueries(queryClient),
    onError: () => toast.error(errorMessage('disconnect')),
  });

  function authorize(authorization: IntervalsAuthorization) {
    if (connect.isPending) return;

    connect.mutate(authorization);
  }

  function handleConnect() {
    authorize(consent.connect);
  }

  function handleGrantHealthDataConsent() {
    authorize(consent.grant);
  }

  function handleHealthDataConsentSwitch(on: boolean) {
    if (!on) authorize(consent.withdraw);
  }

  function handleDisconnect() {
    if (!connection.isConnected) return;

    Alert.alert(t('disconnectConfirmTitle'), t('disconnectConfirmBody'), [
      { text: t('disconnectCancelButton'), style: 'cancel' },
      {
        text: t('disconnectConfirmButton'),
        style: 'destructive',
        onPress: confirmDisconnect,
      },
    ]);
  }

  function confirmDisconnect() {
    if (disconnect.isPending) return;

    disconnect.mutate();
  }

  function errorMessage(mutation: IntervalsAuthMutation): string {
    return t(mapIntervalsAuthError(mutation).key);
  }

  return {
    handleConnect,
    handleGrantHealthDataConsent,
    handleHealthDataConsentSwitch,
    handleDisconnect,
    connecting: connect.isPending,
    disconnecting: disconnect.isPending,
  };
}
