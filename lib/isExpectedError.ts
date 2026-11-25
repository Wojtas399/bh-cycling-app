import { getErrorCode } from './getErrorCode';
import { IntervalsAuthError } from './intervalsApi';
import { statusCodes } from '@react-native-google-signin/google-signin';

const FETCH_NETWORK_FAILURES = [
  'Network request failed',
  'Network request timed out',
];

const EXPECTED_CODES = new Set([
  'auth/network-request-failed',
  'unavailable',
  'deadline-exceeded',
  statusCodes.SIGN_IN_CANCELLED,
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
