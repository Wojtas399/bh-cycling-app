import type { ParseKeys } from 'i18next';

/** An i18n key under `forgotPassword.errors`. */
type ForgotPasswordErrorKey = Extract<
  ParseKeys,
  `forgotPassword.errors.${string}`
>;

/** Forgot-password errors are all form errors; none shows under a field. */
export interface ForgotPasswordErrorMapping {
  key: ForgotPasswordErrorKey;
}

export function mapForgotPasswordError(
  code: string,
): ForgotPasswordErrorMapping {
  switch (code) {
    case 'auth/invalid-email':
      return { key: 'forgotPassword.errors.invalidEmail' };
    case 'auth/user-not-found':
      return { key: 'forgotPassword.errors.userNotFound' };
    case 'auth/too-many-requests':
      return { key: 'forgotPassword.errors.tooManyRequests' };
    case 'auth/network-request-failed':
      return { key: 'forgotPassword.errors.networkFailed' };
    default:
      return { key: 'forgotPassword.errors.generic' };
  }
}
