import { IntervalsAuthError } from './intervalsApi';

export function isExpectedError(error: unknown): boolean {
  return error instanceof IntervalsAuthError;
}
