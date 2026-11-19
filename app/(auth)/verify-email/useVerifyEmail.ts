import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { NOT_VERIFIED_CODE, mapVerifyEmailError } from './verifyEmailErrors';
import { useCooldown } from '@/hooks/useCooldown';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import {
  getVerificationEmailSentAt,
  subscribeVerificationEmailSent,
} from '@/lib/verificationEmail';
import { useMutation } from '@tanstack/react-query';

const COOLDOWN_SECONDS = 60;

export function useVerifyEmail() {
  const { t } = useTranslation();

  // Sign-up and sign-in send the email; this screen never does. Resend opens
  // on cooldown when that send went out in the last minute, and is ready on a
  // cold start, which sends nothing.
  const sentAt = useSyncExternalStore(
    subscribeVerificationEmailSent,
    getVerificationEmailSentAt,
  );
  const [sentRecently] = useState(
    () => sentAt !== null && Date.now() - sentAt < COOLDOWN_SECONDS * 1000,
  );
  const { remaining: cooldown, start: startCooldown } = useCooldown(
    COOLDOWN_SECONDS,
    { startActive: sentRecently },
  );

  // The auth gate can open this screen before the handler records its send,
  // so a send recorded after mount starts the cooldown too.
  const [seenSentAt, setSeenSentAt] = useState(sentAt);

  if (sentAt !== seenSentAt) {
    setSeenSentAt(sentAt);
    startCooldown();
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
