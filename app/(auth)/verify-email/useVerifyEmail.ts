import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { auth } from '@/lib/firebase';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useVerifyEmail() {
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    auth()
      .currentUser?.sendEmailVerification()
      .catch(() => {});
    startCooldown();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

  function getFirebaseErrorMessage(code: string): string {
    if (code === 'auth/network-request-failed') {
      return t('verifyEmail.errors.networkFailed');
    }

    return t('verifyEmail.errors.generic');
  }

  async function handleVerified() {
    setError('');
    setLoading(true);

    try {
      await auth().currentUser?.reload();

      if (auth().currentUser?.emailVerified) {
        router.replace('/(app)/home');
      } else {
        setError(t('verifyEmail.errors.notVerified'));
      }
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
      await auth().currentUser?.sendEmailVerification();
      startCooldown();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';

      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await auth().signOut();
    } catch {
      // sign-out errors are not actionable
    }
  }

  return {
    email: auth().currentUser?.email ?? '',
    loading,
    error,
    cooldown,
    handleVerified,
    handleResend,
    handleSignOut,
  };
}
