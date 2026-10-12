import type { ParseKeys } from 'i18next';

/** An i18n key under `verifyEmail.errors`. */
type VerifyEmailErrorKey = Extract<ParseKeys, `verifyEmail.errors.${string}`>;

/** The code `checkVerified` rejects with when the user is still unverified. */
export const NOT_VERIFIED_CODE = 'verify/not-verified';

/** Verify-email errors are all form errors; none shows under a field. */
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
