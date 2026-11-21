import type { ParseKeys } from 'i18next';

type VerifyEmailErrorKey = Extract<ParseKeys, `verifyEmail.errors.${string}`>;

export const NOT_VERIFIED_CODE = 'verify/not-verified';

export interface VerifyEmailErrorMapping {
  key: VerifyEmailErrorKey;
}

export function mapVerifyEmailError(code: string): VerifyEmailErrorMapping {
  switch (code) {
    case NOT_VERIFIED_CODE:
      return { key: 'verifyEmail.errors.notVerified' };
    case 'auth/network-request-failed':
      return { key: 'verifyEmail.errors.networkFailed' };
    default:
      return { key: 'verifyEmail.errors.generic' };
  }
}
