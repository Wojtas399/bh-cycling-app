import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  type ChangePasswordErrorMapping,
  type ChangePasswordMutation,
  mapChangePasswordError,
} from './changePasswordErrors';
import {
  type ChangePasswordInput,
  type ChangePasswordValues,
  changePasswordSchema,
} from './changePasswordSchema';
import type { FormBinding } from '@/hooks/useFormTextField';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { toast } from '@/lib/toast';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

export function useChangePassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, setFocus, handleSubmit } = useForm<
    ChangePasswordInput,
    unknown,
    ChangePasswordValues
  >({
    resolver: standardSchemaResolver(changePasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePassword = useMutation({
    mutationFn: async (variables: ChangePasswordValues) => {
      const user = auth().currentUser;

      // Maps to the generic form error.
      if (!user?.email) throw new Error('no_email');

      const credential = auth.EmailAuthProvider.credential(
        user.email,
        variables.currentPassword,
      );

      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(variables.newPassword);
    },
    onSuccess: () => {
      toast.success(t('changePassword.success.title'));
      router.back();
    },
  });

  const sendResetEmail = useMutation({
    mutationFn: async (email: string) => {
      await auth().sendPasswordResetEmail(email);
    },
    onSuccess: (_data, email) => {
      Alert.alert(
        t('changePassword.reset.successTitle'),
        t('changePassword.reset.successBody', { email }),
      );
    },
  });

  const busy = changePassword.isPending || sendResetEmail.isPending;

  function mapError(
    mutation: ChangePasswordMutation,
    e: unknown,
  ): ChangePasswordErrorMapping {
    return mapChangePasswordError(mutation, getErrorCode(e));
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mapped: ChangePasswordErrorMapping | null = changePassword.error
    ? mapError('changePassword', changePassword.error)
    : sendResetEmail.error
      ? mapError('sendResetEmail', sendResetEmail.error)
      : null;

  function mappedError(field?: ChangePasswordErrorMapping['field']): string {
    return mapped && mapped.field === field ? t(mapped.key) : '';
  }

  const form: FormBinding<ChangePasswordInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => {
      changePassword.reset();
      sendResetEmail.reset();
    },
    serverError: name => (name === 'confirmPassword' ? '' : mappedError(name)),
    // Editing the new password re-checks "passwords mismatch"; editing the
    // current password re-checks "same as current".
    deps: {
      currentPassword: ['newPassword'],
      newPassword: ['confirmPassword'],
    },
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(async values => {
      sendResetEmail.reset();

      // A failure surfaces through `changePassword.error`.
      await changePassword.mutateAsync(values).catch(() => {});
    })();
  }

  function forgotPassword() {
    const email = auth().currentUser?.email;

    if (!email || busy) return;

    Alert.alert(t('changePassword.reset.confirmTitle', { email }), undefined, [
      { text: t('changePassword.reset.cancelButton'), style: 'cancel' },
      {
        text: t('changePassword.reset.confirmButton'),
        style: 'default',
        onPress: () => {
          if (busy) return;

          changePassword.reset();
          sendResetEmail.mutate(email);
        },
      },
    ]);
  }

  return {
    form,
    formError: mappedError(),
    busy,
    submit,
    forgotPassword,
  };
}
