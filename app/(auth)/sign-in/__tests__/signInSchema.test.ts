import { signInSchema } from '../signInSchema';
import { firstIssuePerField } from '@/test-utils/schemaIssues';
import * as v from 'valibot';

function errors(input: Record<string, string>) {
  return firstIssuePerField(signInSchema, input);
}

describe('signInSchema', () => {
  it('requires both fields', () => {
    expect(errors({ email: '', password: '' })).toEqual({
      email: 'validation.emailRequired',
      password: 'validation.passwordRequired',
    });
  });

  it('treats a whitespace-only email as missing', () => {
    expect(errors({ email: '   ', password: 'password-1' })).toEqual({
      email: 'validation.emailRequired',
    });
  });

  it('rejects a malformed email', () => {
    expect(errors({ email: 'rider@example', password: 'password-1' })).toEqual({
      email: 'validation.emailInvalid',
    });
  });

  it('accepts a password of any length', () => {
    expect(errors({ email: 'rider@example.com', password: 'a' })).toEqual({});
  });

  it('outputs the trimmed email and the untrimmed password', () => {
    expect(
      v.parse(signInSchema, {
        email: '  rider@example.com ',
        password: ' password-1 ',
      }),
    ).toEqual({ email: 'rider@example.com', password: ' password-1 ' });
  });
});
