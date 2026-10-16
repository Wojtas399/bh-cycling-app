import { emailField, requiredString } from '@/lib/validation';
import * as v from 'valibot';

export const signInSchema = v.object({
  email: emailField(),
  password: requiredString('validation.passwordRequired'),
});

export type SignInInput = v.InferInput<typeof signInSchema>;
export type SignInValues = v.InferOutput<typeof signInSchema>;
