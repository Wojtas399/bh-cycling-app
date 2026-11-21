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
import { type FormBinding, noServerErrorOnAnyField } from '@/hooks/formBinding';
import { resetOtherSubmissions } from '@/hooks/formSubmissions';
import { useAppForm } from '@/hooks/useAppForm';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { signInWithGoogle as googleSignInFlow } from '@/lib/signInWithGoogle';
import { sendVerificationEmail } from '@/lib/verificationEmail';
import { useMutation } from '@tanstack/react-query';

export function useSignIn() {
  const { t } = useTranslation();

  const { control, setFocus, handleSubmit } = useAppForm(signInSchema, {
    defaultValues: { email: '', password: '' },
  });

  const emailSignIn = useMutation({
    mutationFn: async (variables: SignInValues) => {
      const { user } = await auth().signInWithEmailAndPassword(
        variables.email,
        variables.password,
      );

      if (!user.emailVerified) await sendVerificationEmail(user);
    },
  });

  const googleSignIn = useMutation({
    mutationFn: googleSignInFlow,
  });

  const submissions = [emailSignIn, googleSignIn];
  const busy = emailSignIn.isPending || googleSignIn.isPending;

  function mapError(mutation: SignInMutation, e: unknown): SignInErrorMapping {
    return mapSignInError(mutation, getErrorCode(e));
  }

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
    serverError: noServerErrorOnAnyField,
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(values => {
      resetOtherSubmissions(emailSignIn, submissions);
      emailSignIn.mutate(values);
    })();
  }

  function signInWithGoogle() {
    if (busy) return;

    resetOtherSubmissions(googleSignIn, submissions);
    googleSignIn.mutate();
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
