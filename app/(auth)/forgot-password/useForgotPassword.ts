import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mapForgotPasswordError } from './forgotPasswordErrors';
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from './forgotPasswordSchema';
import { type FormBinding, formErrorsOnly } from '@/hooks/formBinding';
import { useAppForm } from '@/hooks/useAppForm';
import { useCooldown } from '@/hooks/useCooldown';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const COOLDOWN_SECONDS = 60;

export function useForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, setFocus, handleSubmit } = useAppForm(forgotPasswordSchema, {
    defaultValues: { email: '' },
  });

  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const { remaining: cooldown, start: startCooldown } =
    useCooldown(COOLDOWN_SECONDS);

  const sendOrResendResetEmail = useMutation({
    mutationFn: async (address: string) => {
      await auth().sendPasswordResetEmail(address);
    },
    onSuccess: (_data, address) => {
      setSentEmail(address);
      startCooldown();
    },
  });

  const busy = sendOrResendResetEmail.isPending;

  const form: FormBinding<ForgotPasswordInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => sendOrResendResetEmail.reset(),
    serverError: formErrorsOnly,
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(values => sendOrResendResetEmail.mutate(values.email))();
  }

  function resend() {
    if (!sentEmail || cooldown > 0 || busy) return;

    sendOrResendResetEmail.mutate(sentEmail);
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
    formError: sendOrResendResetEmail.error
      ? t(
          mapForgotPasswordError(getErrorCode(sendOrResendResetEmail.error))
            .key,
        )
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
