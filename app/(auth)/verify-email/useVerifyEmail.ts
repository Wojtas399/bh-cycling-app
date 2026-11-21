import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { NOT_VERIFIED_CODE, mapVerifyEmailError } from './verifyEmailErrors';
import { resetOtherSubmissions } from '@/hooks/formSubmissions';
import { useCooldown } from '@/hooks/useCooldown';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { ignoreFailure } from '@/lib/ignoreFailure';
import {
  getVerificationEmailSentAt,
  subscribeVerificationEmailSent,
} from '@/lib/verificationEmail';
import { useMutation } from '@tanstack/react-query';

const COOLDOWN_SECONDS = 60;

function sentWithinCooldown(sentAt: number | null) {
  return sentAt !== null && Date.now() - sentAt < COOLDOWN_SECONDS * 1000;
}

async function reloadThenRejectIfStillUnverified() {
  await auth().currentUser?.reload();

  if (!auth().currentUser?.emailVerified) {
    throw Object.assign(new Error('Email not verified'), {
      code: NOT_VERIFIED_CODE,
    });
  }
}

export function useVerifyEmail() {
  const { t } = useTranslation();

  const sentAt = useSyncExternalStore(
    subscribeVerificationEmailSent,
    getVerificationEmailSentAt,
  );
  const [openOnCooldown] = useState(() => sentWithinCooldown(sentAt));
  const { remaining: cooldown, start: startCooldown } = useCooldown(
    COOLDOWN_SECONDS,
    { startActive: openOnCooldown },
  );

  const [lastSeenSentAt, setLastSeenSentAt] = useState(sentAt);

  if (sentAt !== lastSeenSentAt) {
    setLastSeenSentAt(sentAt);
    startCooldown();
  }

  const checkVerified = useMutation({
    mutationFn: reloadThenRejectIfStillUnverified,
  });

  const resend = useMutation({
    mutationFn: async () => {
      await auth().currentUser?.sendEmailVerification();
    },
    onSuccess: () => {
      startCooldown();
    },
  });

  const submissions = [checkVerified, resend];
  const loading = checkVerified.isPending || resend.isPending;

  function handleVerified() {
    if (loading) return;

    resetOtherSubmissions(checkVerified, submissions);
    checkVerified.mutate();
  }

  function handleResend() {
    if (cooldown > 0 || loading) return;

    resetOtherSubmissions(resend, submissions);
    resend.mutate();
  }

  function handleSignOut() {
    return ignoreFailure(() => auth().signOut());
  }

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
