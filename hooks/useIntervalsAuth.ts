import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  type IntervalsAuthMutation,
  mapIntervalsAuthError,
} from './intervalsAuthErrors';
import { useIntervalsConnection } from './useIntervalsConnection';
import { functions } from '@/lib/firebase';
import { removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const AUTHORIZATION_ENDPOINT = 'https://intervals.icu/oauth/authorize';
const REDIRECT_URI = 'blackhorsecyclingapp://oauth/intervals';
const SCOPES = ['ACTIVITY:READ,CALENDAR:READ'];

export interface UseIntervalsAuthResult {
  handleConnect: () => Promise<void>;
  handleDisconnect: () => void;
  connecting: boolean;
  disconnecting: boolean;
  error: string;
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
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: false,
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

      await exchangeIntervalsToken({ code: result.params.code });

      return 'connected';
    },
    onSuccess: outcome => {
      if (outcome === 'cancelled') return;

      // Re-enables the gated queries; the 401 already removed the old data.
      setNeedsReconnect(false);
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const disconnectIntervals = functions().httpsCallable(
        'disconnectIntervals',
      );

      await disconnectIntervals();
    },
    onSuccess: async () => {
      // Otherwise reconnecting the same athlete would show the old data.
      await removeIntervalsQueries(queryClient);
    },
  });

  async function handleConnect() {
    if (connect.isPending) return;

    disconnect.reset();

    // A failure surfaces through `connect.error`.
    await connect.mutateAsync().catch(() => {});
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

    connect.reset();
    disconnect.mutate();
  }

  function errorMessage(mutation: IntervalsAuthMutation): string {
    return t(mapIntervalsAuthError(mutation).key);
  }

  const error = connect.error
    ? errorMessage('connect')
    : disconnect.error
      ? errorMessage('disconnect')
      : '';

  return {
    handleConnect,
    handleDisconnect,
    connecting: connect.isPending,
    disconnecting: disconnect.isPending,
    error,
  };
}
