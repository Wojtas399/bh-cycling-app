import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  type DeleteAccountErrorMapping,
  mapDeleteAccountError,
} from './deleteAccountErrors';
import {
  type DeleteAccountInput,
  type DeleteAccountValues,
  deleteAccountSchema,
} from './deleteAccountSchema';
import type { FormBinding } from '@/hooks/useFormTextField';
import { GoogleSignin, auth, functions } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { getSignInMethods } from '@/lib/signInMethods';
import { signOutAndClear } from '@/lib/signOutAndClear';
import { toast } from '@/lib/toast';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';

export function useDeleteAccount() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const requiresPassword = getSignInMethods(auth().currentUser).includes(
    'email',
  );

  const { control, setFocus, handleSubmit } = useForm<
    DeleteAccountInput,
    unknown,
    DeleteAccountValues
  >({
    resolver: standardSchemaResolver(deleteAccountSchema(requiresPassword)),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { password: '' },
  });

  /** Resolves to false when the user cancelled Google sign-in. */
  async function reauthenticate(values: DeleteAccountValues): Promise<boolean> {
    const user = auth().currentUser;

    if (!user) throw new Error('no_user');

    if (requiresPassword) {
      const credential = auth.EmailAuthProvider.credential(
        user.email ?? '',
        values.password,
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
    mutationFn: async (
      values: DeleteAccountValues,
    ): Promise<'deleted' | 'cancelled'> => {
      try {
        if (!(await reauthenticate(values))) return 'cancelled';
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

  const busy = deleteAccount.isPending;

  // Going back is blocked while the request runs: swipe gesture, hardware
  // back button and the header button.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !busy });

    return navigation.addListener('beforeRemove', event => {
      // Only back navigation is blocked: the auth gate must still be able to
      // replace this screen with sign-in once the account is deleted.
      const { type } = event.data.action;

      if (busy && (type === 'GO_BACK' || type === 'POP')) {
        event.preventDefault();
      }
    });
  }, [navigation, busy]);

  const mapped = deleteAccount.error
    ? mapDeleteAccountError(getErrorCode(deleteAccount.error))
    : null;

  function mappedError(field?: DeleteAccountErrorMapping['field']): string {
    return mapped && mapped.field === field ? t(mapped.key) : '';
  }

  const form: FormBinding<DeleteAccountInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => deleteAccount.reset(),
    serverError: name => mappedError(name),
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(async values => {
      // A failure surfaces through `deleteAccount.error`.
      await deleteAccount.mutateAsync(values).catch(() => {});
    })();
  }

  return {
    form,
    formError: mappedError(),
    busy,
    requiresPassword,
    submit,
  };
}
