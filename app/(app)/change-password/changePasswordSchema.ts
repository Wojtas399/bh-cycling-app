import { msg, newPasswordField, requiredString } from '@/lib/validation';
import * as v from 'valibot';

export const changePasswordSchema = v.pipe(
  v.object({
    currentPassword: requiredString(
      'changePassword.validation.currentPasswordRequired',
    ),
    newPassword: newPasswordField(
      'changePassword.validation.newPasswordRequired',
    ),
    confirmPassword: requiredString(
      'changePassword.validation.confirmPasswordRequired',
    ),
  }),
  // Cross-field issues come after each field's own, and the resolver keeps
  // the first issue per field, so each field still shows at most one error.
  v.forward(
    v.check(
      input => input.newPassword !== input.currentPassword,
      msg('changePassword.validation.newPasswordSameAsCurrent'),
    ),
    ['newPassword'],
  ),
  v.forward(
    v.check(
      input => input.confirmPassword === input.newPassword,
      msg('validation.passwordsMismatch'),
    ),
    ['confirmPassword'],
  ),
);

export type ChangePasswordInput = v.InferInput<typeof changePasswordSchema>;
export type ChangePasswordValues = v.InferOutput<typeof changePasswordSchema>;
