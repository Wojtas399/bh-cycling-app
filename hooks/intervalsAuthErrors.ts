import type { ParseKeys, TOptions } from 'i18next';

export type IntervalsAuthMutation = 'connect' | 'disconnect';

/** An i18n key under the `intervals` prefix. */
type IntervalsKey = ParseKeys<'translation', TOptions, 'intervals'>;

export interface IntervalsAuthErrorMapping {
  key: IntervalsKey;
}

/**
 * Connect and disconnect fail in the OAuth flow or a Cloud Function, and none
 * of those codes means more to the athlete than the fallback does, so every
 * code maps to its mutation's fallback.
 */
export function mapIntervalsAuthError(
  mutation: IntervalsAuthMutation,
): IntervalsAuthErrorMapping {
  switch (mutation) {
    case 'connect':
      return { key: 'errors.exchangeFailed' };
    case 'disconnect':
      return { key: 'errors.disconnectFailed' };
  }
}
