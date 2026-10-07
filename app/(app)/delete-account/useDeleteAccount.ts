import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { markAccountDeleted } from '@/lib/accountDeletedStore';
import { GoogleSignin, auth, functions } from '@/lib/firebase';
import { getSignInMethods } from '@/lib/signInMethods';
import { signOutAndClear } from '@/lib/signOutAndClear';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export function useDeleteAccount() {
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requiresPassword = getSignInMethods(auth().currentUser).includes(
    'email',
  );

  function onPasswordChange(text: string) {
    setPassword(text);

    if (passwordError) setPasswordError('');

    if (error) setError('');
  }

  /** Resolves to false when the user cancelled Google sign-in. */
  async function reauthenticate(): Promise<boolean> {
    const user = auth().currentUser;

    if (!user) throw new Error('no_user');

    if (requiresPassword) {
      const credential = auth.EmailAuthProvider.credential(
        user.email ?? '',
        password,
      );

      await user.reauthenticateWithCredential(credential);

      return true;
    }

    await GoogleSignin.hasPlayServices();

    const result = await GoogleSignin.signIn();

    if (result.type === 'cancelled') return false;

    const idToken = result.data?.idToken;

    if (!idToken) throw new Error('no_id_token');

    await user.reauthenticateWithCredential(
      auth.GoogleAuthProvider.credential(idToken),
    );

    return true;
  }

  async function handleDelete() {
    if (loading) return;

    if (requiresPassword && !password) {
      setPasswordError(t('deleteAccount.validation.passwordRequired'));

      return;
    }

    setError('');
    setPasswordError('');
    setLoading(true);

    try {
      if (!(await reauthenticate())) return;

      // Forces a token carrying the new `auth_time`, which the function checks.
      await auth().currentUser?.getIdToken(true);

      await functions().httpsCallable('deleteAccount')();

      markAccountDeleted();
      await signOutAndClear();
    } catch (e) {
      await handleError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleError(e: unknown) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return;

    const code = (e as { code?: string }).code ?? '';

    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setPasswordError(t('deleteAccount.errors.passwordInvalid'));
        break;
      case 'auth/user-mismatch':
        setError(t('deleteAccount.errors.wrongGoogleAccount'));
        // Sign out so the account picker shows again on the next attempt.
        await GoogleSignin.signOut().catch(() => {});
        break;
      case 'failed-precondition':
      case 'functions/failed-precondition':
        setError(t('deleteAccount.errors.reauthRequired'));
        break;
      default:
        setError(t('deleteAccount.errors.generic'));
    }
  }

  return {
    password,
    passwordError,
    error,
    loading,
    requiresPassword,
    onPasswordChange,
    handleDelete,
  };
}
