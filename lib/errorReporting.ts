import { subscribeToAuthState } from './authState';
import { auth } from './firebase';
import { sentryOptions, sentryUser } from './sentryConfig';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export type ErrorDetails = {
  componentStack?: string;
};

function followSignedInAthlete(): void {
  subscribeToAuthState(() => Sentry.setUser(sentryUser(auth().currentUser)));
}

export function startErrorReporting(): void {
  const options = sentryOptions({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    appEnv: Constants.expoConfig?.extra?.appEnv,
    isDev: __DEV__,
  });

  if (!options) return;

  Sentry.init(options);
  followSignedInAthlete();
}

export function reportError(
  error: unknown,
  { componentStack }: ErrorDetails = {},
): void {
  Sentry.captureException(
    error,
    componentStack ? { contexts: { react: { componentStack } } } : undefined,
  );
}
