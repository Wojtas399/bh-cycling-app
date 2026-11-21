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
import type { FormBinding } from '@/hooks/formBinding';
import { resetOtherSubmissions } from '@/hooks/formSubmissions';
import { useAppForm } from '@/hooks/useAppForm';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { toast } from '@/lib/toast';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

export function useChangePassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, setFocus, handleSubmit } = useAppForm(changePasswordSchema, {
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePassword = useMutation({
    mutationFn: async (variables: ChangePasswordValues) => {
      const user = auth().currentUser;

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

  const submissions = [changePassword, sendResetEmail];
  const busy = changePassword.isPending || sendResetEmail.isPending;

  function mapError(
    mutation: ChangePasswordMutation,
    e: unknown,
  ): ChangePasswordErrorMapping {
    return mapChangePasswordError(mutation, getErrorCode(e));
  }

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
    deps: {
      currentPassword: ['newPassword'],
      newPassword: ['confirmPassword'],
    },
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(values => {
      resetOtherSubmissions(changePassword, submissions);
      changePassword.mutate(values);
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

          resetOtherSubmissions(sendResetEmail, submissions);
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
