import { deleteAccountSchema } from '../deleteAccountSchema';
import { firstIssuePerField } from '@/test-utils/schemaIssues';
import * as v from 'valibot';

function errors(requiresPassword: boolean, input: Record<string, string>) {
  return firstIssuePerField(deleteAccountSchema(requiresPassword), input);
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
