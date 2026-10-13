import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  type ChangePasswordErrorMapping,
  type ChangePasswordMutation,
  mapChangePasswordError,
} from './changePasswordErrors';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { toast } from '@/lib/toast';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

interface ChangePasswordVariables {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const changePassword = useMutation({
    mutationFn: async (variables: ChangePasswordVariables) => {
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

  const loading = changePassword.isPending || sendResetEmail.isPending;

  function validate(): boolean {
    let valid = true;

    if (!currentPassword) {
      setCurrentPasswordError(
        t('changePassword.validation.currentPasswordRequired'),
      );
      valid = false;
    }

    if (!newPassword) {
      setNewPasswordError(t('changePassword.validation.newPasswordRequired'));
      valid = false;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(
        t('changePassword.validation.newPasswordTooShort', {
          count: MIN_PASSWORD_LENGTH,
        }),
      );
      valid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError(
        t('changePassword.validation.newPasswordSameAsCurrent'),
      );
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError(
        t('changePassword.validation.confirmPasswordRequired'),
      );
      valid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError(t('changePassword.validation.passwordsMismatch'));
      valid = false;
    }

    return valid;
  }

  function resetMutations() {
    changePassword.reset();
    sendResetEmail.reset();
  }

  function onCurrentPasswordChange(text: string) {
    setCurrentPassword(text);

    if (currentPasswordError) setCurrentPasswordError('');

    resetMutations();
  }

  function onNewPasswordChange(text: string) {
    setNewPassword(text);

    if (newPasswordError) setNewPasswordError('');

    resetMutations();
  }

  function onConfirmPasswordChange(text: string) {
    setConfirmPassword(text);

    if (confirmPasswordError) setConfirmPasswordError('');

    resetMutations();
  }

  async function handleSubmit() {
    if (loading || !validate()) return;

    sendResetEmail.reset();

    // A failure surfaces through `changePassword.error`.
    await changePassword
      .mutateAsync({ currentPassword, newPassword })
      .catch(() => {});
  }

  function handleForgotPassword() {
    const email = auth().currentUser?.email;

    if (!email || loading) return;

    Alert.alert(t('changePassword.reset.confirmTitle', { email }), undefined, [
      { text: t('changePassword.reset.cancelButton'), style: 'cancel' },
      {
        text: t('changePassword.reset.confirmButton'),
        style: 'default',
        onPress: () => {
          if (sendResetEmail.isPending) return;

          changePassword.reset();
          sendResetEmail.mutate(email);
        },
      },
    ]);
  }

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

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    currentPasswordError:
      currentPasswordError || mappedError('currentPassword'),
    newPasswordError: newPasswordError || mappedError('newPassword'),
    confirmPasswordError,
    error: mappedError(),
    loading,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    handleSubmit,
    handleForgotPassword,
  };
}
