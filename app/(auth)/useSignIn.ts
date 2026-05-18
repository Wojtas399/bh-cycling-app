import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import { GoogleSignin, auth } from '@/lib/firebase';
import { EMAIL_REGEX } from '@/lib/validation';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';

export function useSignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return t('signIn.errors.invalidCredential');
      case 'auth/invalid-email':
        return t('signIn.errors.invalidEmail');
      case 'auth/too-many-requests':
        return t('signIn.errors.tooManyRequests');
      case 'auth/network-request-failed':
        return t('signIn.errors.networkFailed');
      default:
        return t('signIn.errors.generic');
    }
  }

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError(t('signIn.validation.emailRequired'));
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('signIn.validation.emailInvalid'));
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('signIn.validation.passwordRequired'));
      valid = false;
    } else {
      setPasswordError('');
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

  async function handleSignIn() {
    if (!validate()) return;

    setError('');
    setLoading(true);

    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      router.replace('/(app)');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';

      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
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
      router.replace('/(app)');
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
        return;

      setError(t('signIn.validation.googleFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  return {
    email,
    password,
    emailError,
    passwordError,
    error,
    loading,
    googleLoading,
    disabled: loading || googleLoading,
    passwordRef,
    onEmailChange,
    onPasswordChange,
    handleSignIn,
    handleGoogleSignIn,
  };
}
