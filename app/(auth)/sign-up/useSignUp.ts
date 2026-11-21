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
import { type FormBinding, formErrorsOnly } from '@/hooks/formBinding';
import { resetOtherSubmissions } from '@/hooks/formSubmissions';
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

  const submissions = [emailSignUp, googleSignUp];
  const busy = emailSignUp.isPending || googleSignUp.isPending;

  function mapError(mutation: SignUpMutation, e: unknown): SignUpErrorMapping {
    return mapSignUpError(mutation, getErrorCode(e));
  }

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
    serverError: formErrorsOnly,
    deps: { password: ['confirmPassword'] },
  };

  async function submit() {
    if (busy) return;

    await handleSubmit(values => {
      resetOtherSubmissions(emailSignUp, submissions);
      emailSignUp.mutate(values);
    })();
  }

  function signUpWithGoogle() {
    if (busy) return;

    resetOtherSubmissions(googleSignUp, submissions);
    googleSignUp.mutate();
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
