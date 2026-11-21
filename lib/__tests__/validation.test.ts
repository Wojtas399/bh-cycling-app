import {
  emailField,
  isTranslationKey,
  newPasswordField,
  requiredString,
} from '../validation';
import '@/i18n';
import * as v from 'valibot';

function firstIssueMessageOrNull(schema: v.GenericSchema, input: unknown) {
  const result = v.safeParse(schema, input);

  return result.issues?.[0].message ?? null;
}

describe('requiredString', () => {
  const schema = requiredString(
    'changePassword.validation.currentPasswordRequired',
  );

  it('rejects an empty string with the given key', () => {
    expect(firstIssueMessageOrNull(schema, '')).toBe(
      'changePassword.validation.currentPasswordRequired',
    );
  });

  it('accepts any non-empty string as typed', () => {
    expect(v.parse(schema, ' x ')).toBe(' x ');
  });
});

describe('emailField', () => {
  const schema = emailField();

  it.each(['', '   '])('requires an email (%j)', input => {
    expect(firstIssueMessageOrNull(schema, input)).toBe(
      'validation.emailRequired',
    );
  });

  it.each(['rider', 'rider@', 'rider@example', 'ri der@example.com'])(
    'rejects a malformed email (%j)',
    input => {
      expect(firstIssueMessageOrNull(schema, input)).toBe(
        'validation.emailInvalid',
      );
    },
  );

  it('accepts a valid email and trims it', () => {
    expect(v.parse(schema, '  rider@example.com ')).toBe('rider@example.com');
  });
});

describe('newPasswordField', () => {
  it('requires a password with the shared key by default', () => {
    expect(firstIssueMessageOrNull(newPasswordField(), '')).toBe(
      'validation.passwordRequired',
    );
  });

  it('requires a password with a form-specific key', () => {
    expect(
      firstIssueMessageOrNull(
        newPasswordField('changePassword.validation.newPasswordRequired'),
        '',
      ),
    ).toBe('changePassword.validation.newPasswordRequired');
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(firstIssueMessageOrNull(newPasswordField(), '1234567')).toBe(
      'validation.passwordTooShort',
    );
  });

  it('accepts 8 characters and does not trim', () => {
    expect(v.parse(newPasswordField(), ' 234567 ')).toBe(' 234567 ');
  });

  it('counts spaces towards the minimum length', () => {
    expect(firstIssueMessageOrNull(newPasswordField(), '       ')).toBe(
      'validation.passwordTooShort',
    );
  });
});

describe('isTranslationKey', () => {
  it('recognises a key the translations define', () => {
    expect(isTranslationKey('validation.passwordsMismatch')).toBe(true);
  });

  it('rejects a message that is not a key', () => {
    expect(isTranslationKey('Passwords do not match')).toBe(false);
  });

  it('rejects an unknown key under a known section', () => {
    expect(isTranslationKey('validation.noSuchMessage')).toBe(false);
  });

  it('rejects a section that only groups other keys', () => {
    expect(isTranslationKey('validation')).toBe(false);
  });
});
