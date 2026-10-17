import { mapSignInError } from '../signInErrors';

describe('mapSignInError', () => {
  it.each([
    ['auth/invalid-credential', 'signIn.errors.invalidCredential'],
    ['auth/wrong-password', 'signIn.errors.invalidCredential'],
    ['auth/user-not-found', 'signIn.errors.invalidCredential'],
    ['auth/invalid-email', 'signIn.errors.invalidEmail'],
    ['auth/too-many-requests', 'signIn.errors.tooManyRequests'],
    ['auth/network-request-failed', 'signIn.errors.networkFailed'],
  ])('sends email %s to the form error', (code, key) => {
    expect(mapSignInError('emailSignIn', code)).toEqual({ key });
  });

  it('falls back to the generic form error for email', () => {
    expect(mapSignInError('emailSignIn', 'auth/something-else')).toEqual({
      key: 'signIn.errors.generic',
    });
    expect(mapSignInError('emailSignIn', '')).toEqual({
      key: 'signIn.errors.generic',
    });
  });

  it.each(['auth/network-request-failed', 'auth/invalid-credential', ''])(
    'maps Google %s to the Google failure',
    code => {
      expect(mapSignInError('googleSignIn', code)).toEqual({
        key: 'signIn.errors.googleFailed',
      });
    },
  );
});
