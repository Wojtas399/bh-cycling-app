import { mapForgotPasswordError } from '../forgotPasswordErrors';

describe('mapForgotPasswordError', () => {
  it.each([
    ['auth/invalid-email', 'forgotPassword.errors.invalidEmail'],
    ['auth/user-not-found', 'forgotPassword.errors.userNotFound'],
    ['auth/too-many-requests', 'forgotPassword.errors.tooManyRequests'],
    ['auth/network-request-failed', 'forgotPassword.errors.networkFailed'],
  ])('sends %s to the form error', (code, key) => {
    expect(mapForgotPasswordError(code)).toEqual({ key });
  });

  it('falls back to the generic form error', () => {
    expect(mapForgotPasswordError('auth/something-else')).toEqual({
      key: 'forgotPassword.errors.generic',
    });
    expect(mapForgotPasswordError('')).toEqual({
      key: 'forgotPassword.errors.generic',
    });
  });
});
