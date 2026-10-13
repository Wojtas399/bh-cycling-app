import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type SignUpErrorMapping,
  type SignUpMutation,
  mapSignUpError,
} from './signUpErrors';
import { auth } from '@/lib/firebase';
import { getErrorCode } from '@/lib/getErrorCode';
import { signInWithGoogle } from '@/lib/signInWithGoogle';
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

interface EmailSignUpVariables {
  email: string;
  password: string;
}

export function useSignUp() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const emailSignUp = useMutation({
    mutationFn: async (variables: EmailSignUpVariables) => {
      await auth().createUserWithEmailAndPassword(
        variables.email,
        variables.password,
      );
    },
    onSuccess: () => {
      router.replace('/(auth)/verify-email');
    },
  });

  const googleSignUp = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: outcome => {
      if (outcome === 'cancelled') return;

      router.replace('/(app)/(tabs)/home');
    },
  });

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError(t('signUp.validation.emailRequired'));
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('signUp.validation.emailInvalid'));
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('signUp.validation.passwordRequired'));
      valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('signUp.validation.passwordTooShort'));
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t('signUp.validation.confirmPasswordRequired'));
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t('signUp.validation.passwordsMismatch'));
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  }

  function resetMutations() {
    emailSignUp.reset();
    googleSignUp.reset();
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

  function onConfirmPasswordChange(text: string) {
    setConfirmPassword(text);

    if (confirmPasswordError) setConfirmPasswordError('');

    resetMutations();
  }

  async function handleGoogleSignUp() {
    if (googleSignUp.isPending) return;

    emailSignUp.reset();

    // A failure surfaces through `googleSignUp.error`.
    await googleSignUp.mutateAsync().catch(() => {});
  }

  async function handleSignUp() {
    if (emailSignUp.isPending || !validate()) return;

    googleSignUp.reset();

    // A failure surfaces through `emailSignUp.error`.
    await emailSignUp
      .mutateAsync({ email: email.trim(), password })
      .catch(() => {});
  }

  function mapError(mutation: SignUpMutation, e: unknown): SignUpErrorMapping {
    return mapSignUpError(mutation, getErrorCode(e));
  }

  // Starting one mutation resets the other, so at most one has an error.
  const mapped: SignUpErrorMapping | null = emailSignUp.error
    ? mapError('emailSignUp', emailSignUp.error)
    : googleSignUp.error
      ? mapError('googleSignUp', googleSignUp.error)
      : null;

  return {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    error: mapped ? t(mapped.key) : '',
    loading: emailSignUp.isPending,
    googleLoading: googleSignUp.isPending,
    disabled: emailSignUp.isPending || googleSignUp.isPending,
    onEmailChange,
    onPasswordChange,
    onConfirmPasswordChange,
    handleSignUp,
    handleGoogleSignUp,
  };
}
