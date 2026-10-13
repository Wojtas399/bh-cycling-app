import { mapVerifyEmailError } from '../verifyEmailErrors';

describe('mapVerifyEmailError', () => {
  it('maps the not-verified sentinel to notVerified', () => {
    expect(mapVerifyEmailError('verify/not-verified')).toEqual({
      key: 'verifyEmail.errors.notVerified',
    });
  });

  it('maps a network failure to networkFailed', () => {
    expect(mapVerifyEmailError('auth/network-request-failed')).toEqual({
      key: 'verifyEmail.errors.networkFailed',
    });
  });

  it('falls back to the generic form error', () => {
    expect(mapVerifyEmailError('auth/something-else')).toEqual({
      key: 'verifyEmail.errors.generic',
    });
    expect(mapVerifyEmailError('')).toEqual({
      key: 'verifyEmail.errors.generic',
    });
  });
});
