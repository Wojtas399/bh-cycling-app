import { getErrorCode } from './getErrorCode';
import { IntervalsAuthError } from './intervalsApi';
import { statusCodes } from '@react-native-google-signin/google-signin';

const FETCH_NETWORK_FAILURES = [
  'Network request failed',
  'Network request timed out',
];

const NETWORK_FAILURE_CODES = [
  'auth/network-request-failed',
  'unavailable',
  'deadline-exceeded',
];

const AUTH_CODES_A_SCREEN_SHOWS_AS_A_SPECIFIC_MESSAGE = [
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/invalid-email',
  'auth/user-not-found',
  'auth/too-many-requests',
  'auth/user-mismatch',
];

const EXPECTED_CODES = new Set([
  ...NETWORK_FAILURE_CODES,
  statusCodes.SIGN_IN_CANCELLED,
  ...AUTH_CODES_A_SCREEN_SHOWS_AS_A_SPECIFIC_MESSAGE,
]);

function isFetchNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError && FETCH_NETWORK_FAILURES.includes(error.message)
  );
}

export function isExpectedError(error: unknown): boolean {
  return (
    error instanceof IntervalsAuthError ||
    isFetchNetworkFailure(error) ||
    EXPECTED_CODES.has(getErrorCode(error))
  );
}
