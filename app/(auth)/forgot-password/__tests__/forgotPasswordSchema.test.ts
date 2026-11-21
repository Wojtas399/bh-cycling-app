import { forgotPasswordSchema } from '../forgotPasswordSchema';
import { firstIssuePerField } from '@/test-utils/schemaIssues';
import * as v from 'valibot';

function errors(input: Record<string, string>) {
  return firstIssuePerField(forgotPasswordSchema, input);
}

describe('forgotPasswordSchema', () => {
  it.each(['', '   '])('requires an email (%j)', email => {
    expect(errors({ email })).toEqual({ email: 'validation.emailRequired' });
  });

  it.each(['rider', 'rider@example', 'rider @example.com'])(
    'rejects a malformed email (%s)',
    email => {
      expect(errors({ email })).toEqual({ email: 'validation.emailInvalid' });
    },
  );

  it('accepts a valid email and trims it', () => {
    const result = v.safeParse(forgotPasswordSchema, {
      email: '  rider@example.com ',
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ email: 'rider@example.com' });
  });
});
