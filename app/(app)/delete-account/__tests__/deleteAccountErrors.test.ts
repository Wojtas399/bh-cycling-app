import { mapDeleteAccountError } from '../deleteAccountErrors';

describe('mapDeleteAccountError', () => {
  it.each(['auth/wrong-password', 'auth/invalid-credential'])(
    'sends %s to the password field',
    code => {
      expect(mapDeleteAccountError(code)).toEqual({
        field: 'password',
        key: 'deleteAccount.errors.passwordInvalid',
      });
    },
  );

  it('sends auth/user-mismatch to the form error', () => {
    expect(mapDeleteAccountError('auth/user-mismatch')).toEqual({
      key: 'deleteAccount.errors.wrongGoogleAccount',
    });
  });

  it.each(['failed-precondition', 'functions/failed-precondition'])(
    'asks for reauthentication again on %s',
    code => {
      expect(mapDeleteAccountError(code)).toEqual({
        key: 'deleteAccount.errors.reauthRequired',
      });
    },
  );

  it('falls back to the generic form error', () => {
    expect(mapDeleteAccountError('functions/unavailable')).toEqual({
      key: 'deleteAccount.errors.generic',
    });
    expect(mapDeleteAccountError('')).toEqual({
      key: 'deleteAccount.errors.generic',
    });
  });
});
