import { changePasswordSchema } from '../changePasswordSchema';
import * as v from 'valibot';

/** The first issue key per field, as the resolver reports it. */
function errors(input: Record<string, string>) {
  const result = v.safeParse(changePasswordSchema, input);
  const byField: Record<string, string> = {};

  for (const issue of result.issues ?? []) {
    const field = v.getDotPath(issue) ?? 'root';

    byField[field] ??= issue.message;
  }

  return byField;
}

describe('changePasswordSchema', () => {
  it('requires all three fields', () => {
    expect(
      errors({ currentPassword: '', newPassword: '', confirmPassword: '' }),
    ).toEqual({
      currentPassword: 'changePassword.validation.currentPasswordRequired',
      newPassword: 'changePassword.validation.newPasswordRequired',
      confirmPassword: 'changePassword.validation.confirmPasswordRequired',
    });
  });

  it('rejects a new password shorter than the minimum length', () => {
    expect(
      errors({
        currentPassword: 'old-password',
        newPassword: '1234567',
        confirmPassword: '1234567',
      }),
    ).toEqual({ newPassword: 'validation.passwordTooShort' });
  });

  it('rejects a new password equal to the current one', () => {
    expect(
      errors({
        currentPassword: 'same-password',
        newPassword: 'same-password',
        confirmPassword: 'same-password',
      }),
    ).toEqual({
      newPassword: 'changePassword.validation.newPasswordSameAsCurrent',
    });
  });

  it('rejects a confirmation that does not match', () => {
    expect(
      errors({
        currentPassword: 'old-password',
        newPassword: 'new-password-1',
        confirmPassword: 'new-password-2',
      }),
    ).toEqual({ confirmPassword: 'validation.passwordsMismatch' });
  });

  it('compares the passwords exactly, without trimming', () => {
    expect(
      errors({
        currentPassword: 'old-password',
        newPassword: 'new-password-1',
        confirmPassword: 'new-password-1 ',
      }),
    ).toEqual({ confirmPassword: 'validation.passwordsMismatch' });
  });

  it('leaves an empty confirmation to its own required error', () => {
    expect(
      errors({
        currentPassword: 'old-password',
        newPassword: 'new-password-1',
        confirmPassword: '',
      }),
    ).toEqual({
      confirmPassword: 'changePassword.validation.confirmPasswordRequired',
    });
  });

  it('still checks the confirmation when the current password is empty', () => {
    expect(
      errors({
        currentPassword: '',
        newPassword: 'new-password-1',
        confirmPassword: 'new-password-2',
      }),
    ).toEqual({
      currentPassword: 'changePassword.validation.currentPasswordRequired',
      confirmPassword: 'validation.passwordsMismatch',
    });
  });

  // Matches the hand-written validation this schema replaced.
  it('shows the mismatch even while the new password has its own error', () => {
    expect(
      errors({
        currentPassword: 'old-password',
        newPassword: 'short',
        confirmPassword: 'different',
      }),
    ).toEqual({
      newPassword: 'validation.passwordTooShort',
      confirmPassword: 'validation.passwordsMismatch',
    });
  });

  it('accepts a valid form and does not trim passwords', () => {
    const result = v.safeParse(changePasswordSchema, {
      currentPassword: ' old ',
      newPassword: ' new-password-1',
      confirmPassword: ' new-password-1',
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      currentPassword: ' old ',
      newPassword: ' new-password-1',
      confirmPassword: ' new-password-1',
    });
  });
});
