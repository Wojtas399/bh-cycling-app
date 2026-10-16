import { requiredString } from '@/lib/validation';
import * as v from 'valibot';

/** Accounts with an email sign-in method confirm with their password. */
const passwordSchema = v.object({
  // Never trimmed: a password is checked exactly as typed.
  password: requiredString('validation.passwordRequired'),
});

/**
 * Google-only accounts have no field and confirm through Google, so nothing
 * is validated. Same shape as `passwordSchema`, because a form binding needs
 * one value type.
 */
const googleSchema = v.object({ password: v.string() });

export function deleteAccountSchema(requiresPassword: boolean) {
  return requiresPassword ? passwordSchema : googleSchema;
}

/** The form always holds a password value; Google-only users never see it. */
export type DeleteAccountInput = v.InferInput<typeof passwordSchema>;
export type DeleteAccountValues = v.InferOutput<typeof passwordSchema>;
