import {
  msg,
  newPasswordField,
  passwordsMatch,
  requiredString,
} from '@/lib/validation';
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
  v.forward(
    v.check(
      input => input.newPassword !== input.currentPassword,
      msg('changePassword.validation.newPasswordSameAsCurrent'),
    ),
    ['newPassword'],
  ),
  passwordsMatch('newPassword', 'confirmPassword'),
);

export type ChangePasswordInput = v.InferInput<typeof changePasswordSchema>;
export type ChangePasswordValues = v.InferOutput<typeof changePasswordSchema>;
