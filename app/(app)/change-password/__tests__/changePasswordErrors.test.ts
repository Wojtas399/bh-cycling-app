import { mapChangePasswordError } from '../changePasswordErrors';

describe('mapChangePasswordError', () => {
  it.each(['auth/wrong-password', 'auth/invalid-credential'])(
    'sends %s to the current password field',
    code => {
      expect(mapChangePasswordError('changePassword', code)).toEqual({
        field: 'currentPassword',
        key: 'changePassword.errors.currentPasswordInvalid',
      });
    },
  );

  it('sends auth/weak-password to the new password field', () => {
    expect(
      mapChangePasswordError('changePassword', 'auth/weak-password'),
    ).toEqual({
      field: 'newPassword',
      key: 'changePassword.errors.weakPassword',
    });
  });

  it.each([
    ['auth/too-many-requests', 'changePassword.errors.tooManyRequests'],
    ['auth/network-request-failed', 'changePassword.errors.networkFailed'],
  ])('sends %s to the form error', (code, key) => {
    expect(mapChangePasswordError('changePassword', code)).toEqual({ key });
  });

  it.each(['auth/wrong-password', 'auth/weak-password'])(
    'keeps %s on the form for the reset email',
    code => {
      expect(mapChangePasswordError('sendResetEmail', code)).toEqual({
        key: 'changePassword.errors.generic',
      });
    },
  );

  it('maps the reset email form codes like the change', () => {
    expect(
      mapChangePasswordError('sendResetEmail', 'auth/network-request-failed'),
    ).toEqual({ key: 'changePassword.errors.networkFailed' });
  });

  it('falls back to the generic form error', () => {
    expect(
      mapChangePasswordError('changePassword', 'auth/something-else'),
    ).toEqual({
      key: 'changePassword.errors.generic',
    });
    expect(mapChangePasswordError('changePassword', '')).toEqual({
      key: 'changePassword.errors.generic',
    });
  });
});
