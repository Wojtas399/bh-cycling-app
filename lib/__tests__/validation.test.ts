import {
  emailField,
  newPasswordField,
  passwordsMatch,
  requiredString,
} from '../validation';
import * as v from 'valibot';

/** The first issue message, as the resolver reports it, or null if valid. */
function firstError(schema: v.GenericSchema, input: unknown) {
  const result = v.safeParse(schema, input);

  return result.issues?.[0].message ?? null;
}

describe('requiredString', () => {
  const schema = requiredString(
    'changePassword.validation.currentPasswordRequired',
  );

  it('rejects an empty string with the given key', () => {
    expect(firstError(schema, '')).toBe(
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
    expect(firstError(schema, input)).toBe('validation.emailRequired');
  });

  it.each(['rider', 'rider@', 'rider@example', 'ri der@example.com'])(
    'rejects a malformed email (%j)',
    input => {
      expect(firstError(schema, input)).toBe('validation.emailInvalid');
    },
  );

  it('accepts a valid email and trims it', () => {
    expect(v.parse(schema, '  rider@example.com ')).toBe('rider@example.com');
  });
});

describe('newPasswordField', () => {
  it('requires a password with the shared key by default', () => {
    expect(firstError(newPasswordField(), '')).toBe(
      'validation.passwordRequired',
    );
  });

  it('requires a password with a form-specific key', () => {
    expect(
      firstError(
        newPasswordField('changePassword.validation.newPasswordRequired'),
        '',
      ),
    ).toBe('changePassword.validation.newPasswordRequired');
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(firstError(newPasswordField(), '1234567')).toBe(
      'validation.passwordTooShort',
    );
  });

  it('accepts 8 characters and does not trim', () => {
    expect(v.parse(newPasswordField(), ' 234567 ')).toBe(' 234567 ');
  });

  it('counts spaces towards the minimum length', () => {
    expect(firstError(newPasswordField(), '       ')).toBe(
      'validation.passwordTooShort',
    );
  });
});

describe('passwordsMatch', () => {
  const schema = v.pipe(
    v.object({
      password: newPasswordField(),
      confirm: requiredString('validation.passwordRequired'),
    }),
    passwordsMatch('password', 'confirm'),
  );

  function errorsByField(input: Record<string, string>) {
    const byField: Record<string, string> = {};

    for (const issue of v.safeParse(schema, input).issues ?? []) {
      byField[v.getDotPath(issue) ?? 'root'] ??= issue.message;
    }

    return byField;
  }

  it('reports a mismatch on the confirmation field', () => {
    expect(
      errorsByField({ password: 'password-1', confirm: 'password-2' }),
    ).toEqual({ confirm: 'validation.passwordsMismatch' });
  });

  it('accepts matching passwords', () => {
    expect(
      errorsByField({ password: 'password-1', confirm: 'password-1' }),
    ).toEqual({});
  });

  it('compares passwords exactly, without trimming', () => {
    expect(
      errorsByField({ password: 'password-1', confirm: 'password-1 ' }),
    ).toEqual({ confirm: 'validation.passwordsMismatch' });
  });

  it('still reports a mismatch while the password is too short', () => {
    expect(errorsByField({ password: 'short', confirm: 'other' })).toEqual({
      password: 'validation.passwordTooShort',
      confirm: 'validation.passwordsMismatch',
    });
  });

  it('leaves an empty confirmation to its own required error', () => {
    expect(errorsByField({ password: 'password-1', confirm: '' })).toEqual({
      confirm: 'validation.passwordRequired',
    });
  });
});
