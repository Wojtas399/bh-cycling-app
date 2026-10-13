import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mapForgotPasswordError } from './forgotPasswordErrors';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { EMAIL_REGEX } from '@/lib/validation';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Send and resend hit the same endpoint, so they share one mutation.
  const sendReset = useMutation({
    mutationFn: async (address: string) => {
      await auth().sendPasswordResetEmail(address);
    },
    onSuccess: () => {
      setSuccess(true);
      startCooldown();
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

    sendReset.reset();
  }

  async function handleSend() {
    if (sendReset.isPending || !validate()) return;

    // A failure surfaces through `sendReset.error`.
    await sendReset.mutateAsync(email.trim()).catch(() => {});
  }

  async function handleResend() {
    if (cooldown > 0 || sendReset.isPending) return;

    // A failure surfaces through `sendReset.error`.
    await sendReset.mutateAsync(email.trim()).catch(() => {});
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
    error: sendReset.error
      ? t(mapForgotPasswordError(getErrorCode(sendReset.error)).key)
      : '',
    loading: sendReset.isPending,
    success,
    cooldown,
    disabled: sendReset.isPending,
    onEmailChange,
    handleSend,
    handleResend,
    handleBackToSignIn,
  };
}
