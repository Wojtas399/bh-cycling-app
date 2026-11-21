import { signUpSchema } from '../signUpSchema';
import {
  firstIssuePerField,
  issueMessagesByField,
} from '@/test-utils/schemaIssues';
import * as v from 'valibot';

function errors(input: Record<string, string>) {
  return firstIssuePerField(signUpSchema, input);
}

describe('signUpSchema', () => {
  it('requires all three fields', () => {
    expect(errors({ email: '', password: '', confirmPassword: '' })).toEqual({
      email: 'validation.emailRequired',
      password: 'validation.passwordRequired',
      confirmPassword: 'signUp.validation.confirmPasswordRequired',
    });
  });

  it('treats a whitespace-only email as missing', () => {
    expect(
      errors({
        email: '   ',
        password: 'password-1',
        confirmPassword: 'password-1',
      }),
    ).toEqual({ email: 'validation.emailRequired' });
  });

  it('rejects a malformed email', () => {
    expect(
      errors({
        email: 'rider@example',
        password: 'password-1',
        confirmPassword: 'password-1',
      }),
    ).toEqual({ email: 'validation.emailInvalid' });
  });

  it('rejects a password shorter than the minimum length', () => {
    expect(
      errors({
        email: 'rider@example.com',
        password: '1234567',
        confirmPassword: '1234567',
      }),
    ).toEqual({ password: 'validation.passwordTooShort' });
  });

  it('rejects a confirmation that does not match', () => {
    expect(
      errors({
        email: 'rider@example.com',
        password: 'password-1',
        confirmPassword: 'password-2',
      }),
    ).toEqual({ confirmPassword: 'validation.passwordsMismatch' });
  });

  it('still checks the confirmation when the email is invalid', () => {
    expect(
      errors({
        email: '',
        password: 'password-1',
        confirmPassword: 'password-2',
      }),
    ).toEqual({
      email: 'validation.emailRequired',
      confirmPassword: 'validation.passwordsMismatch',
    });
  });

  it('shows the mismatch even while the password has its own error', () => {
    expect(
      errors({
        email: 'rider@example.com',
        password: 'short',
        confirmPassword: 'different',
      }),
    ).toEqual({
      password: 'validation.passwordTooShort',
      confirmPassword: 'validation.passwordsMismatch',
    });
  });

  it("reports the confirmation's own issue before the mismatch, so the first-issue resolver shows one error per field", () => {
    expect(
      issueMessagesByField(signUpSchema, {
        email: 'rider@example.com',
        password: 'password-1',
        confirmPassword: '',
      }),
    ).toEqual({
      confirmPassword: [
        'signUp.validation.confirmPasswordRequired',
        'validation.passwordsMismatch',
      ],
    });
  });

  it('trims the email but never the passwords', () => {
    const result = v.safeParse(signUpSchema, {
      email: '  rider@example.com ',
      password: ' password-1 ',
      confirmPassword: ' password-1 ',
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      email: 'rider@example.com',
      password: ' password-1 ',
      confirmPassword: ' password-1 ',
    });
  });
});
