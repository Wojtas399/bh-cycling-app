import { mapSignUpError } from '../signUpErrors';

describe('mapSignUpError', () => {
  it.each([
    ['auth/email-already-in-use', 'signUp.errors.emailAlreadyInUse'],
    ['auth/weak-password', 'signUp.errors.weakPassword'],
    ['auth/invalid-email', 'signUp.errors.invalidEmail'],
    ['auth/network-request-failed', 'signUp.errors.networkFailed'],
  ])('sends email %s to the form error', (code, key) => {
    expect(mapSignUpError('emailSignUp', code)).toEqual({ key });
  });

  it('falls back to the generic form error for email', () => {
    expect(mapSignUpError('emailSignUp', 'auth/something-else')).toEqual({
      key: 'signUp.errors.generic',
    });
    expect(mapSignUpError('emailSignUp', '')).toEqual({
      key: 'signUp.errors.generic',
    });
  });

  it.each(['auth/network-request-failed', 'auth/email-already-in-use', ''])(
    'maps Google %s to the Google failure',
    code => {
      expect(mapSignUpError('googleSignUp', code)).toEqual({
        key: 'signUp.errors.googleFailed',
      });
    },
  );
});
