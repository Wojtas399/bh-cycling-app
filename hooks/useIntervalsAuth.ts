import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useIntervalsConnection } from './useIntervalsConnection';
import { functions } from '@/lib/firebase';
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
  const { t } = useTranslation();
  const connection = useIntervalsConnection();

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    setError('');
    setConnecting(true);

    try {
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
        return;
      }

      const exchangeIntervalsToken = functions().httpsCallable(
        'exchangeIntervalsToken',
      );

      await exchangeIntervalsToken({
        code: result.params.code,
        clientId,
      });
    } catch {
      setError(t('intervals.errors.exchangeFailed'));
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (!connection.isConnected) return;

    Alert.alert(
      t('intervals.disconnectConfirmTitle'),
      t('intervals.disconnectConfirmBody'),
      [
        { text: t('intervals.disconnectCancelButton'), style: 'cancel' },
        {
          text: t('intervals.disconnectConfirmButton'),
          style: 'destructive',
          onPress: confirmDisconnect,
        },
      ],
    );
  }

  async function confirmDisconnect() {
    setError('');
    setDisconnecting(true);

    try {
      const disconnectIntervals = functions().httpsCallable(
        'disconnectIntervals',
      );

      await disconnectIntervals();
    } catch {
      setError(t('intervals.errors.disconnectFailed'));
    } finally {
      setDisconnecting(false);
    }
  }

  return { handleConnect, handleDisconnect, connecting, disconnecting, error };
}
