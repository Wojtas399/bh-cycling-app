import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { auth } from '@/lib/firebase';
import { EMAIL_REGEX } from '@/lib/validation';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  function getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return t('forgotPassword.errors.invalidEmail');
      case 'auth/user-not-found':
        return t('forgotPassword.errors.userNotFound');
      case 'auth/too-many-requests':
        return t('forgotPassword.errors.tooManyRequests');
      case 'auth/network-request-failed':
        return t('forgotPassword.errors.networkFailed');
      default:
        return t('forgotPassword.errors.generic');
    }
  }

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError(t('forgotPassword.validation.emailRequired'));

      return false;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('forgotPassword.validation.emailInvalid'));

      return false;
    }

    setEmailError('');

    return true;
  }

  function onEmailChange(text: string) {
    setEmail(text);

    if (emailError) setEmailError('');

    if (error) setError('');
  }

  async function handleSend() {
    if (!validate()) return;

    setError('');
    setLoading(true);

    try {
      await auth().sendPasswordResetEmail(email.trim());
      setSuccess(true);
      startCooldown();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';

      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;

    setError('');
    setLoading(true);

    try {
      await auth().sendPasswordResetEmail(email.trim());
      startCooldown();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';

      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  function handleBackToSignIn() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-in');
    }
  }

  return {
    email,
    emailError,
    error,
    loading,
    success,
    cooldown,
    disabled: loading,
    onEmailChange,
    handleSend,
    handleResend,
    handleBackToSignIn,
  };
}
