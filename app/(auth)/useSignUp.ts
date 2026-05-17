import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoogleSignin, auth } from '@/lib/firebase';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useSignUp() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return t('signUp.errors.emailAlreadyInUse');
      case 'auth/weak-password':
        return t('signUp.errors.weakPassword');
      case 'auth/invalid-email':
        return t('signUp.errors.invalidEmail');
      case 'auth/network-request-failed':
        return t('signUp.errors.networkFailed');
      default:
        return t('signUp.errors.generic');
    }
  }

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError(t('signUp.validation.emailRequired'));
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('signUp.validation.emailInvalid'));
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('signUp.validation.passwordRequired'));
      valid = false;
    } else if (password.length < 8) {
      setPasswordError(t('signUp.validation.passwordTooShort'));
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t('signUp.validation.confirmPasswordRequired'));
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t('signUp.validation.passwordsMismatch'));
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  }

  function onEmailChange(text: string) {
    setEmail(text);

    if (emailError) setEmailError('');
  }

  function onPasswordChange(text: string) {
    setPassword(text);

    if (passwordError) setPasswordError('');
  }

  function onConfirmPasswordChange(text: string) {
    setConfirmPassword(text);

    if (confirmPasswordError) setConfirmPasswordError('');
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;

      if (!idToken) throw new Error('no_id_token');

      const credential = auth.GoogleAuthProvider.credential(idToken);

      await auth().signInWithCredential(credential);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
        return;

      setError(t('signUp.validation.googleFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignUp() {
    if (!validate()) return;

    setError('');
    setLoading(true);

    try {
      await auth().createUserWithEmailAndPassword(email.trim(), password);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';

      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    error,
    loading,
    googleLoading,
    disabled: loading || googleLoading,
    onEmailChange,
    onPasswordChange,
    onConfirmPasswordChange,
    handleSignUp,
    handleGoogleSignIn,
  };
}
