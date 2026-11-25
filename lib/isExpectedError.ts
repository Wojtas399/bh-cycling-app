import { IntervalsAuthError } from './intervalsApi';

const FETCH_NETWORK_FAILURES = [
  'Network request failed',
  'Network request timed out',
];

function isFetchNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError && FETCH_NETWORK_FAILURES.includes(error.message)
  );
}

export function isExpectedError(error: unknown): boolean {
  return error instanceof IntervalsAuthError || isFetchNetworkFailure(error);
}
