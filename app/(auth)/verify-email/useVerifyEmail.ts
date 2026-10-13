import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NOT_VERIFIED_CODE, mapVerifyEmailError } from './verifyEmailErrors';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useVerifyEmail() {
  const { t } = useTranslation();
  const router = useRouter();

  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    if (intervalRef.current) clearInterval(intervalRef.current);

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

  const checkVerified = useMutation({
    mutationFn: async () => {
      await auth().currentUser?.reload();

      // Rejecting makes "still unverified" show like any other error.
      if (!auth().currentUser?.emailVerified) {
        throw Object.assign(new Error('Email not verified'), {
          code: NOT_VERIFIED_CODE,
        });
      }
    },
    onSuccess: () => {
      router.replace('/(app)/(tabs)/home');
    },
  });

  const resend = useMutation({
    mutationFn: async () => {
      await auth().currentUser?.sendEmailVerification();
    },
    onSuccess: () => {
      startCooldown();
    },
  });

  const loading = checkVerified.isPending || resend.isPending;

  useEffect(() => {
    auth()
      .currentUser?.sendEmailVerification()
      .catch(() => {});
    startCooldown();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleVerified() {
    if (loading) return;

    resend.reset();

    // A failure surfaces through `checkVerified.error`.
    await checkVerified.mutateAsync().catch(() => {});
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;

    checkVerified.reset();

    // A failure surfaces through `resend.error`.
    await resend.mutateAsync().catch(() => {});
  }

  async function handleSignOut() {
    try {
      await auth().signOut();
    } catch {
      // sign-out errors are not actionable
    }
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mutationError = checkVerified.error ?? resend.error;

  return {
    email: auth().currentUser?.email ?? '',
    loading,
    error: mutationError
      ? t(mapVerifyEmailError(getErrorCode(mutationError)).key)
      : '',
    cooldown,
    handleVerified,
    handleResend,
    handleSignOut,
  };
}
