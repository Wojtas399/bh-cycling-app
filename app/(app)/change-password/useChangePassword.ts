import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useRouter } from 'expo-router';

export function useChangePassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getFormErrorMessage(code: string): string {
    switch (code) {
      case 'auth/too-many-requests':
        return t('changePassword.errors.tooManyRequests');
      case 'auth/network-request-failed':
        return t('changePassword.errors.networkFailed');
      default:
        return t('changePassword.errors.generic');
    }
  }

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

  function onCurrentPasswordChange(text: string) {
    setCurrentPassword(text);

    if (currentPasswordError) setCurrentPasswordError('');

    if (error) setError('');
  }

  function onNewPasswordChange(text: string) {
    setNewPassword(text);

    if (newPasswordError) setNewPasswordError('');

    if (error) setError('');
  }

  function onConfirmPasswordChange(text: string) {
    setConfirmPassword(text);

    if (confirmPasswordError) setConfirmPasswordError('');

    if (error) setError('');
  }

  async function handleSubmit() {
    if (loading || !validate()) return;

    const user = auth().currentUser;

    if (!user?.email) {
      setError(t('changePassword.errors.generic'));

      return;
    }

    setError('');
    setLoading(true);

    try {
      const credential = auth.EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );

      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(newPassword);

      Alert.alert(t('changePassword.success.title'), undefined, [
        {
          text: t('changePassword.success.ok'),
          style: 'default',
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      const code = getErrorCode(e);

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setCurrentPasswordError(
          t('changePassword.errors.currentPasswordInvalid'),
        );
      } else if (code === 'auth/weak-password') {
        setNewPasswordError(t('changePassword.errors.weakPassword'));
      } else {
        setError(getFormErrorMessage(code));
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendResetEmail(email: string) {
    setError('');
    setLoading(true);

    try {
      await auth().sendPasswordResetEmail(email);

      Alert.alert(
        t('changePassword.reset.successTitle'),
        t('changePassword.reset.successBody', { email }),
      );
    } catch (e) {
      setError(getFormErrorMessage(getErrorCode(e)));
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    const email = auth().currentUser?.email;

    if (!email || loading) return;

    Alert.alert(t('changePassword.reset.confirmTitle', { email }), undefined, [
      { text: t('changePassword.reset.cancelButton'), style: 'cancel' },
      {
        text: t('changePassword.reset.confirmButton'),
        style: 'default',
        onPress: () => sendResetEmail(email),
      },
    ]);
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    currentPasswordError,
    newPasswordError,
    confirmPasswordError,
    error,
    loading,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    handleSubmit,
    handleForgotPassword,
  };
}
