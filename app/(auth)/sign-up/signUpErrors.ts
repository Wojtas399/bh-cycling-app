import type { ParseKeys } from 'i18next';

/** An i18n key under `signUp.errors`. */
type SignUpErrorKey = Extract<ParseKeys, `signUp.errors.${string}`>;

export type SignUpMutation = 'emailSignUp' | 'googleSignUp';

/** Sign-up errors are all form errors; none shows under a field. */
export interface SignUpErrorMapping {
  key: SignUpErrorKey;
}

export function mapSignUpError(
  mutation: SignUpMutation,
  code: string,
): SignUpErrorMapping {
  if (mutation === 'googleSignUp') return { key: 'signUp.errors.googleFailed' };

  switch (code) {
    case 'auth/email-already-in-use':
      return { key: 'signUp.errors.emailAlreadyInUse' };
    case 'auth/weak-password':
      return { key: 'signUp.errors.weakPassword' };
    case 'auth/invalid-email':
      return { key: 'signUp.errors.invalidEmail' };
    case 'auth/network-request-failed':
      return { key: 'signUp.errors.networkFailed' };
    default:
      return { key: 'signUp.errors.generic' };
  }
}
