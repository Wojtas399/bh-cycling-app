import { forgotPasswordSchema } from '../forgotPasswordSchema';
import * as v from 'valibot';

/** The first issue key per field, as the resolver reports it. */
function errors(input: Record<string, string>) {
  const result = v.safeParse(forgotPasswordSchema, input);
  const byField: Record<string, string> = {};

  for (const issue of result.issues ?? []) {
    const field = v.getDotPath(issue) ?? 'root';

    byField[field] ??= issue.message;
  }

  return byField;
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
