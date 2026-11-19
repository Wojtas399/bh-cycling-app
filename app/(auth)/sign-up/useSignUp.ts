import { useTranslation } from 'react-i18next';

import {
  type SignUpErrorMapping,
  type SignUpMutation,
  mapSignUpError,
} from './signUpErrors';
import {
  type SignUpInput,
  type SignUpValues,
  signUpSchema,
} from './signUpSchema';
import type { FormBinding } from '@/hooks/formBinding';
import { useAppForm } from '@/hooks/useAppForm';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { signInWithGoogle } from '@/lib/signInWithGoogle';
import { sendVerificationEmail } from '@/lib/verificationEmail';
import { useMutation } from '@tanstack/react-query';

export function useSignUp() {
  const { t } = useTranslation();

  const { control, setFocus, handleSubmit } = useAppForm(signUpSchema, {
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const emailSignUp = useMutation({
    mutationFn: async (variables: SignUpValues) => {
      const { user } = await auth().createUserWithEmailAndPassword(
        variables.email,
        variables.password,
      );

      await sendVerificationEmail(user);
    },
  });

  const googleSignUp = useMutation({
    mutationFn: signInWithGoogle,
  });

  const busy = emailSignUp.isPending || googleSignUp.isPending;

  function mapError(mutation: SignUpMutation, e: unknown): SignUpErrorMapping {
    return mapSignUpError(mutation, getErrorCode(e));
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mapped: SignUpErrorMapping | null = emailSignUp.error
    ? mapError('emailSignUp', emailSignUp.error)
    : googleSignUp.error
      ? mapError('googleSignUp', googleSignUp.error)
      : null;

  const form: FormBinding<SignUpInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => {
      emailSignUp.reset();
      googleSignUp.reset();
    },
    // Every sign-up server error is a form error.
    serverError: () => '',
    // Editing the password re-checks "passwords mismatch".
    deps: { password: ['confirmPassword'] },
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(async values => {
      googleSignUp.reset();

      // A failure surfaces through `emailSignUp.error`.
      await emailSignUp.mutateAsync(values).catch(() => {});
    })();
  }

  async function signUpWithGoogle() {
    if (busy) return;

    emailSignUp.reset();

    // A failure surfaces through `googleSignUp.error`.
    await googleSignUp.mutateAsync().catch(() => {});
  }

  return {
    form,
    formError: mapped ? t(mapped.key) : '',
    busy,
    emailPending: emailSignUp.isPending,
    googlePending: googleSignUp.isPending,
    submit,
    signUpWithGoogle,
  };
}
