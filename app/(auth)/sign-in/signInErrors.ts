import type { ParseKeys } from 'i18next';

/** An i18n key for a sign-in failure. */
type SignInErrorKey = Extract<ParseKeys, `signIn.errors.${string}`>;

export type SignInMutation = 'emailSignIn' | 'googleSignIn';

/** Sign-in errors are all form errors; none shows under a field. */
export interface SignInErrorMapping {
  key: SignInErrorKey;
}

export function mapSignInError(
  mutation: SignInMutation,
  code: string,
): SignInErrorMapping {
  if (mutation === 'googleSignIn') {
    return { key: 'signIn.errors.googleFailed' };
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { key: 'signIn.errors.invalidCredential' };
    case 'auth/invalid-email':
      return { key: 'signIn.errors.invalidEmail' };
    case 'auth/too-many-requests':
      return { key: 'signIn.errors.tooManyRequests' };
    case 'auth/network-request-failed':
      return { key: 'signIn.errors.networkFailed' };
    default:
      return { key: 'signIn.errors.generic' };
  }
}
