import { deleteAccountSchema } from '../deleteAccountSchema';
import * as v from 'valibot';

/** The first issue key per field, as the resolver reports it. */
function errors(requiresPassword: boolean, input: Record<string, string>) {
  const result = v.safeParse(deleteAccountSchema(requiresPassword), input);
  const byField: Record<string, string> = {};

  for (const issue of result.issues ?? []) {
    const field = v.getDotPath(issue) ?? 'root';

    byField[field] ??= issue.message;
  }

  return byField;
}

describe('deleteAccountSchema', () => {
  describe('password accounts', () => {
    it('requires a password', () => {
      expect(errors(true, { password: '' })).toEqual({
        password: 'validation.passwordRequired',
      });
    });

    it('keeps the password as typed, without trimming', () => {
      expect(
        v.parse(deleteAccountSchema(true), { password: '  secret  ' }),
      ).toEqual({ password: '  secret  ' });
    });
  });

  describe('google-only accounts', () => {
    it('accepts an empty password', () => {
      expect(errors(false, { password: '' })).toEqual({});
    });
  });
});
