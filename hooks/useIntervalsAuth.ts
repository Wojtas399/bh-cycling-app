import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  type IntervalsAuthMutation,
  mapIntervalsAuthError,
} from './intervalsAuthErrors';
import { useHealthDataConsent } from './useHealthDataConsent';
import { useIntervalsConnection } from './useIntervalsConnection';
import {
  HEALTH_DATA_CONSENT_PARAGRAPHS,
  PRIVACY_POLICY_URL,
} from '@/constants/legal';
import { functions } from '@/lib/firebase';
import type {
  HealthDataAction,
  IntervalsAuthorization,
} from '@/lib/healthDataConsent';
import { setHealthDataConsentWithdrawn } from '@/lib/healthDataConsentWithdrawalStore';
import { ignoreFailure } from '@/lib/ignoreFailure';
import {
  intervalsKeys,
  removeHealthDataQueries,
  removeIntervalsQueries,
} from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { asOneCommaSeparatedScope } from '@/lib/intervalsScopes';
import { toast } from '@/lib/toast';
import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as v from 'valibot';

WebBrowser.maybeCompleteAuthSession();

const AUTHORIZATION_ENDPOINT = 'https://intervals.icu/oauth/authorize';
const REDIRECT_URI = 'blackhorsecyclingapp://oauth/intervals';

const healthDataConsentGivenSchema = v.object({
  healthDataConsentGiven: v.literal(true),
});

type AuthorizationOutcome =
  | 'cancelled'
  | 'connected'
  | 'connectedWithHealthDataConsent';

export interface UseIntervalsAuthResult {
  handleConnect: () => void;
  handleGrantHealthDataConsent: () => void;
  handleHealthDataConsentSwitch: (on: boolean) => void;
  handleDisconnect: () => void;
  healthDataConsentGiven: boolean;
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
    }: IntervalsAuthorization): Promise<AuthorizationOutcome> => {
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

      const { data } = await exchangeIntervalsToken({
        code: result.params.code,
        codeVerifier: request.codeVerifier,
        healthData,
      });

      return v.is(healthDataConsentGivenSchema, data)
        ? 'connectedWithHealthDataConsent'
        : 'connected';
    },
    onSuccess: async (outcome, { healthData }) => {
      if (outcome === 'cancelled') return;

      if (healthData.action === 'withdraw') {
        setHealthDataConsentWithdrawn(true);
        await removeHealthDataQueries(queryClient);
      } else if (outcome === 'connectedWithHealthDataConsent') {
        setHealthDataConsentWithdrawn(false);
      }

      refetchIntervalsUnderNewConsent(queryClient);
      showAuthorized(healthData.action, outcome);
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

  function showAuthorized(
    action: HealthDataAction['action'],
    outcome: Exclude<AuthorizationOutcome, 'cancelled'>,
  ) {
    if (action === 'withdraw') {
      toast.success(t('healthDataConsentSwitch.withdrawn'));
    } else if (
      action === 'grant' &&
      outcome !== 'connectedWithHealthDataConsent'
    ) {
      toast.warning(t('healthDataConsentNotGiven'));
    } else {
      toast.success(t('connected'));
    }
  }

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
    if (!on) {
      authorize(consent.withdraw);
    } else if (consent.state === 'needsReauthorization') {
      authorize(consent.connect);
    } else {
      askForHealthDataConsent();
    }
  }

  function askForHealthDataConsent() {
    Alert.alert(
      t('healthDataConsentPrompt.title'),
      HEALTH_DATA_CONSENT_PARAGRAPHS.map(paragraph =>
        t(`healthDataConsentPrompt.${paragraph}`),
      ).join('\n\n'),
      [
        { text: t('healthDataConsentSwitch.cancel'), style: 'cancel' },
        {
          text: t('healthDataConsentPrompt.privacyPolicy'),
          onPress: readPrivacyPolicyThenAskAgain,
        },
        {
          text: t('healthDataConsentSwitch.agree'),
          onPress: handleGrantHealthDataConsent,
        },
      ],
    );
  }

  async function readPrivacyPolicyThenAskAgain() {
    await ignoreFailure(() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL));
    askForHealthDataConsent();
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
    healthDataConsentGiven: consent.state === 'given',
    connecting: connect.isPending,
    disconnecting: disconnect.isPending,
  };
}
