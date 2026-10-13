import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import {
  type SignInErrorMapping,
  type SignInMutation,
  mapSignInError,
} from './signInErrors';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { signInWithGoogle } from '@/lib/signInWithGoogle';
import { EMAIL_REGEX } from '@/lib/validation';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

interface EmailSignInVariables {
  email: string;
  password: string;
}

export function useSignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const emailSignIn = useMutation({
    mutationFn: async (variables: EmailSignInVariables) => {
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
    mutationFn: signInWithGoogle,
    onSuccess: outcome => {
      if (outcome === 'cancelled') return;

      router.replace('/(app)/(tabs)/home');
    },
  });

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError(t('signIn.validation.emailRequired'));
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('signIn.validation.emailInvalid'));
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('signIn.validation.passwordRequired'));
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  }

  function resetMutations() {
    emailSignIn.reset();
    googleSignIn.reset();
  }

  function onEmailChange(text: string) {
    setEmail(text);

    if (emailError) setEmailError('');

    resetMutations();
  }

  function onPasswordChange(text: string) {
    setPassword(text);

    if (passwordError) setPasswordError('');

    resetMutations();
  }

  async function handleSignIn() {
    if (emailSignIn.isPending || !validate()) return;

    googleSignIn.reset();

    // A failure surfaces through `emailSignIn.error`.
    await emailSignIn
      .mutateAsync({ email: email.trim(), password })
      .catch(() => {});
  }

  async function handleGoogleSignIn() {
    if (googleSignIn.isPending) return;

    emailSignIn.reset();

    // A failure surfaces through `googleSignIn.error`.
    await googleSignIn.mutateAsync().catch(() => {});
  }

  function mapError(mutation: SignInMutation, e: unknown): SignInErrorMapping {
    return mapSignInError(mutation, getErrorCode(e));
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mapped: SignInErrorMapping | null = emailSignIn.error
    ? mapError('emailSignIn', emailSignIn.error)
    : googleSignIn.error
      ? mapError('googleSignIn', googleSignIn.error)
      : null;

  return {
    email,
    password,
    emailError,
    passwordError,
    error: mapped ? t(mapped.key) : '',
    loading: emailSignIn.isPending,
    googleLoading: googleSignIn.isPending,
    disabled: emailSignIn.isPending || googleSignIn.isPending,
    passwordRef,
    onEmailChange,
    onPasswordChange,
    handleSignIn,
    handleGoogleSignIn,
  };
}
