import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  type IntervalsAuthMutation,
  mapIntervalsAuthError,
} from './intervalsAuthErrors';
import { COMMA_SEPARATED_CONSENT_SCOPES } from './intervalsScopes';
import { useIntervalsConnection } from './useIntervalsConnection';
import { functions } from '@/lib/firebase';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
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
  const queryClient = useQueryClient();

  const connect = useMutation({
    mutationFn: async (): Promise<'connected' | 'cancelled'> => {
      const clientId = process.env.EXPO_PUBLIC_INTERVALS_CLIENT_ID ?? '';
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: COMMA_SEPARATED_CONSENT_SCOPES,
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
      });

      return 'connected';
    },
    onSuccess: outcome => {
      if (outcome === 'cancelled') return;

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

  function handleConnect() {
    if (connect.isPending) return;

    connect.mutate();
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
    handleDisconnect,
    connecting: connect.isPending,
    disconnecting: disconnect.isPending,
  };
}
