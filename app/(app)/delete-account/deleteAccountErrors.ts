import type { ParseKeys } from 'i18next';

/** An i18n key under `deleteAccount.errors`. */
type DeleteAccountErrorKey = Extract<
  ParseKeys,
  `deleteAccount.errors.${string}`
>;

export interface DeleteAccountErrorMapping {
  /** The field the error shows under; the form error when absent. */
  field?: 'password';
  key: DeleteAccountErrorKey;
}

export function mapDeleteAccountError(code: string): DeleteAccountErrorMapping {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return { field: 'password', key: 'deleteAccount.errors.passwordInvalid' };
    case 'auth/user-mismatch':
      return { key: 'deleteAccount.errors.wrongGoogleAccount' };
    case 'failed-precondition':
    case 'functions/failed-precondition':
      return { key: 'deleteAccount.errors.reauthRequired' };
    default:
      return { key: 'deleteAccount.errors.generic' };
  }
}
