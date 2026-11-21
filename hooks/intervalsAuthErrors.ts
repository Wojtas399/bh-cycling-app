import type { ParseKeys, TOptions } from 'i18next';

export type IntervalsAuthMutation = 'connect' | 'disconnect';

type IntervalsKey = ParseKeys<'translation', TOptions, 'intervals'>;

export interface IntervalsAuthErrorMapping {
  key: IntervalsKey;
}

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
