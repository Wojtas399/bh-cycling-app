import { useTranslation } from 'react-i18next';

import {
  type SignInErrorMapping,
  type SignInMutation,
  mapSignInError,
} from './signInErrors';
import {
  type SignInInput,
  type SignInValues,
  signInSchema,
} from './signInSchema';
import type { FormBinding } from '@/hooks/formBinding';
import { useAppForm } from '@/hooks/useAppForm';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { signInWithGoogle as googleSignInFlow } from '@/lib/signInWithGoogle';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

export function useSignIn() {
  const { t } = useTranslation();
  const router = useRouter();

  const { control, setFocus, handleSubmit } = useAppForm(signInSchema, {
    defaultValues: { email: '', password: '' },
  });

  const emailSignIn = useMutation({
    mutationFn: async (variables: SignInValues) => {
      await auth().signInWithEmailAndPassword(
        variables.email,
        variables.password,
      );
    },
    onSuccess: () => {
      router.replace('/(app)/(tabs)/home');
    },
  });

  const googleSignIn = useMutation({
    mutationFn: googleSignInFlow,
    onSuccess: outcome => {
      if (outcome === 'cancelled') return;

      router.replace('/(app)/(tabs)/home');
    },
  });

  const busy = emailSignIn.isPending || googleSignIn.isPending;

  function mapError(mutation: SignInMutation, e: unknown): SignInErrorMapping {
    return mapSignInError(mutation, getErrorCode(e));
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mapped: SignInErrorMapping | null = emailSignIn.error
    ? mapError('emailSignIn', emailSignIn.error)
    : googleSignIn.error
      ? mapError('googleSignIn', googleSignIn.error)
      : null;

  const form: FormBinding<SignInInput> = {
    control,
    setFocus,
    busy,
    onFieldChange: () => {
      emailSignIn.reset();
      googleSignIn.reset();
    },
    // Sign-in errors are all form errors; none shows under a field.
    serverError: () => '',
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(async values => {
      googleSignIn.reset();

      // A failure surfaces through `emailSignIn.error`.
      await emailSignIn.mutateAsync(values).catch(() => {});
    })();
  }

  async function signInWithGoogle() {
    if (busy) return;

    emailSignIn.reset();

    // A failure surfaces through `googleSignIn.error`.
    await googleSignIn.mutateAsync().catch(() => {});
  }

  return {
    form,
    formError: mapped ? t(mapped.key) : '',
    busy,
    emailPending: emailSignIn.isPending,
    googlePending: googleSignIn.isPending,
    submit,
    signInWithGoogle,
  };
}
