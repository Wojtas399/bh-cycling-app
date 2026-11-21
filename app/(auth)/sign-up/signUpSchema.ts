import {
  emailField,
  msg,
  newPasswordField,
  requiredString,
} from '@/lib/validation';
import * as v from 'valibot';

export const signUpSchema = v.pipe(
  v.object({
    email: emailField(),
    password: newPasswordField(),
    confirmPassword: requiredString(
      'signUp.validation.confirmPasswordRequired',
    ),
  }),
  v.forward(
    v.check(
      input => input.confirmPassword === input.password,
      msg('validation.passwordsMismatch'),
    ),
    ['confirmPassword'],
  ),
);

export type SignUpInput = v.InferInput<typeof signUpSchema>;
export type SignUpValues = v.InferOutput<typeof signUpSchema>;
