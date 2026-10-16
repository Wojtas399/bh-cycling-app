import { emailField } from '@/lib/validation';
import * as v from 'valibot';

export const forgotPasswordSchema = v.object({
  email: emailField(),
});

export type ForgotPasswordInput = v.InferInput<typeof forgotPasswordSchema>;
export type ForgotPasswordValues = v.InferOutput<typeof forgotPasswordSchema>;
