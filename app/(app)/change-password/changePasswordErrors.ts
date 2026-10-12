import type { ParseKeys } from 'i18next';

/** An i18n key under `changePassword.errors`. */
type ChangePasswordErrorKey = Extract<
  ParseKeys,
  `changePassword.errors.${string}`
>;

export type ChangePasswordMutation = 'changePassword' | 'sendResetEmail';

export interface ChangePasswordErrorMapping {
  /** The field the error shows under; the form error when absent. */
  field?: 'currentPassword' | 'newPassword';
  key: ChangePasswordErrorKey;
}

/** The reset email has no fields of its own, so its errors are form errors. */
export function mapChangePasswordError(
  mutation: ChangePasswordMutation,
  code: string,
): ChangePasswordErrorMapping {
  if (mutation === 'changePassword') {
    const fieldMapping = mapFieldError(code);

    if (fieldMapping) return fieldMapping;
  }

  switch (code) {
    case 'auth/too-many-requests':
      return { key: 'changePassword.errors.tooManyRequests' };
    case 'auth/network-request-failed':
      return { key: 'changePassword.errors.networkFailed' };
    default:
      return { key: 'changePassword.errors.generic' };
  }
}

function mapFieldError(code: string): ChangePasswordErrorMapping | null {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        field: 'currentPassword',
        key: 'changePassword.errors.currentPasswordInvalid',
      };
    case 'auth/weak-password':
      return {
        field: 'newPassword',
        key: 'changePassword.errors.weakPassword',
      };
    default:
      return null;
  }
}
