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
import type { FormBinding } from '@/hooks/formBinding';
import { useAppForm } from '@/hooks/useAppForm';
import { GoogleSignin, auth, functions } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { ignoreFailure } from '@/lib/ignoreFailure';
import { getSignInMethods } from '@/lib/signInMethods';
import { signOutAndClear } from '@/lib/signOutAndClear';
import { toast } from '@/lib/toast';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import {
  type NavigationAction,
  usePreventRemove,
} from 'expo-router/react-navigation';

const GOING_BACK_ACTIONS = ['GO_BACK', 'POP'];

function refreshIdTokenToCarryNewAuthTime() {
  return auth().currentUser?.getIdToken(true);
}

function signOutOfGoogleSoThePickerShowsAgain() {
  return ignoreFailure(() => GoogleSignin.signOut());
}

export function useDeleteAccount() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const requiresPassword = getSignInMethods(auth().currentUser).includes(
    'email',
  );

  const { control, setFocus, handleSubmit } = useAppForm(
    deleteAccountSchema(requiresPassword),
    {
      defaultValues: { password: '' },
    },
  );

  async function reauthenticate(
    values: DeleteAccountValues,
  ): Promise<'reauthenticated' | 'cancelled'> {
    const user = auth().currentUser;

    if (!user) throw new Error('no_user');

    if (requiresPassword) {
      const credential = auth.EmailAuthProvider.credential(
        user.email ?? '',
        values.password,
      );

      await user.reauthenticateWithCredential(credential);

      return 'reauthenticated';
    }

    await GoogleSignin.hasPlayServices();

    const result = await GoogleSignin.signIn();

    if (result.type === 'cancelled') return 'cancelled';

    const idToken = result.data?.idToken;

    if (!idToken) throw new Error('no_id_token');

    await user.reauthenticateWithCredential(
      auth.GoogleAuthProvider.credential(idToken),
    );

    return 'reauthenticated';
  }

  async function reauthenticateThenDelete(
    values: DeleteAccountValues,
  ): Promise<'deleted' | 'cancelled'> {
    try {
      if ((await reauthenticate(values)) === 'cancelled') return 'cancelled';
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        return 'cancelled';
      }

      throw e;
    }

    await refreshIdTokenToCarryNewAuthTime();
    await functions().httpsCallable('deleteAccount')();

    return 'deleted';
  }

  const deleteAccount = useMutation({
    mutationFn: reauthenticateThenDelete,
    onSuccess: async outcome => {
      if (outcome === 'cancelled') return;

      toast.success(t('deleteAccount.deleted'));
      await signOutAndClear();
    },
    onError: async e => {
      if (getErrorCode(e) === 'auth/user-mismatch') {
        await signOutOfGoogleSoThePickerShowsAgain();
      }
    },
  });

  const busy = deleteAccount.isPending;

  function letThroughAnyRemovalButGoingBack(action: NavigationAction) {
    if (!GOING_BACK_ACTIONS.includes(action.type)) navigation.dispatch(action);
  }

  usePreventRemove(busy, ({ data }) =>
    letThroughAnyRemovalButGoingBack(data.action),
  );

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

    await handleSubmit(values => deleteAccount.mutate(values))();
  }

  return {
    form,
    formError: mappedError(),
    busy,
    requiresPassword,
    submit,
  };
}
