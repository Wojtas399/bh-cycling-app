import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { mapForgotPasswordError } from './forgotPasswordErrors';
import {
  type ForgotPasswordInput,
  type ForgotPasswordValues,
  forgotPasswordSchema,
} from './forgotPasswordSchema';
import type { FormBinding } from '@/hooks/useFormTextField';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, setFocus, handleSubmit } = useForm<
    ForgotPasswordInput,
    unknown,
    ForgotPasswordValues
  >({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { email: '' },
  });

  // The parsed email of the last successful send. Resend reuses it, not the
  // field, and its presence means the success state is showing.
  const [sentEmail, setSentEmail] = useState<string | null>(null);
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
    onSuccess: (_data, address) => {
      setSentEmail(address);
      startCooldown();
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const busy = sendReset.isPending;

  const form: FormBinding<ForgotPasswordInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => sendReset.reset(),
    // Every forgot-password server error is a form error.
    serverError: () => '',
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(async values => {
      // A failure surfaces through `sendReset.error`.
      await sendReset.mutateAsync(values.email).catch(() => {});
    })();
  }

  async function resend() {
    if (!sentEmail || cooldown > 0 || busy) return;

    // A failure surfaces through `sendReset.error`.
    await sendReset.mutateAsync(sentEmail).catch(() => {});
  }

  function backToSignIn() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-in');
    }
  }

  return {
    form,
    formError: sendReset.error
      ? t(mapForgotPasswordError(getErrorCode(sendReset.error)).key)
      : '',
    busy,
    submit,
    resend,
    backToSignIn,
    success: sentEmail !== null,
    sentEmail,
    cooldown,
  };
}
