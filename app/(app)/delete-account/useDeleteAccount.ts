import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type DeleteAccountErrorMapping,
  mapDeleteAccountError,
} from './deleteAccountErrors';
import { GoogleSignin, auth, functions } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { getSignInMethods } from '@/lib/signInMethods';
import { signOutAndClear } from '@/lib/signOutAndClear';
import { toast } from '@/lib/toast';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';

export function useDeleteAccount() {
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const requiresPassword = getSignInMethods(auth().currentUser).includes(
    'email',
  );

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

  const deleteAccount = useMutation({
    mutationFn: async (): Promise<'deleted' | 'cancelled'> => {
      try {
        if (!(await reauthenticate())) return 'cancelled';
      } catch (e) {
        if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
          return 'cancelled';
        }

        throw e;
      }

      // Forces a token carrying the new `auth_time`, which the function checks.
      await auth().currentUser?.getIdToken(true);

      await functions().httpsCallable('deleteAccount')();

      return 'deleted';
    },
    onSuccess: async outcome => {
      if (outcome === 'cancelled') return;

      // The root toast host outlives the sign-out redirect to sign-in.
      toast.success(t('deleteAccount.deleted'));
      await signOutAndClear();
    },
    onError: async e => {
      if (getErrorCode(e) !== 'auth/user-mismatch') return;

      // Sign out so the account picker shows again on the next attempt.
      await GoogleSignin.signOut().catch(() => {});
    },
  });

  function onPasswordChange(text: string) {
    setPassword(text);

    if (passwordError) setPasswordError('');

    deleteAccount.reset();
  }

  async function handleDelete() {
    if (deleteAccount.isPending) return;

    if (requiresPassword && !password) {
      setPasswordError(t('deleteAccount.validation.passwordRequired'));

      return;
    }

    // A failure surfaces through `deleteAccount.error`.
    await deleteAccount.mutateAsync().catch(() => {});
  }

  const mapped = deleteAccount.error
    ? mapDeleteAccountError(getErrorCode(deleteAccount.error))
    : null;

  function mappedError(field?: DeleteAccountErrorMapping['field']): string {
    return mapped && mapped.field === field ? t(mapped.key) : '';
  }

  return {
    password,
    passwordError: passwordError || mappedError('password'),
    error: mappedError(),
    loading: deleteAccount.isPending,
    requiresPassword,
    onPasswordChange,
    handleDelete,
  };
}
