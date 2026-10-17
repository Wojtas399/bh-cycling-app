import type { ParseKeys } from 'i18next';
import * as v from 'valibot';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Schemas carry i18n keys as messages; the form layer translates them at
 * render. Typed so a typo in a key fails `tsc`.
 */
export function msg(key: ParseKeys): string {
  return key;
}

/** A non-empty string, kept as typed. */
export function requiredString(requiredKey: ParseKeys) {
  return v.pipe(v.string(), v.nonEmpty(msg(requiredKey)));
}

/**
 * A new password: required, then at least `MIN_PASSWORD_LENGTH` characters.
 * Never trimmed.
 */
export function newPasswordField(
  requiredKey: ParseKeys = 'validation.passwordRequired',
) {
  return v.pipe(
    v.string(),
    v.nonEmpty(msg(requiredKey)),
    v.minLength(MIN_PASSWORD_LENGTH, msg('validation.passwordTooShort')),
  );
}

/**
 * A cross-field check for an object schema's pipe: the `confirm` field must
 * equal the `password` field exactly. The issue lands on `confirm`; a field's
 * own error comes first, so it still shows at most one error. Pair it with
 * `deps: { [password]: [confirm] }` in the form hook.
 */
export function passwordsMatch<
  T extends Record<string, unknown>,
  P extends keyof T & string = keyof T & string,
  C extends keyof T & string = keyof T & string,
>(password: P, confirm: C) {
  type Issue = v.CheckIssue<T>;
  // valibot can't prove a generic key is a valid path; `confirm` is a key of
  // `T` by its type.
  type ConfirmPath = Parameters<typeof v.forward<T, Issue, [C]>>[1];

  return v.forward<T, Issue, [C]>(
    v.check(
      input => (input[confirm] as unknown) === input[password],
      msg('validation.passwordsMismatch'),
    ),
    [confirm] as ConfirmPath,
  );
}

/** A required, well-formed email. Trimmed, so the output has no spaces. */
export function emailField() {
  return v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(msg('validation.emailRequired')),
    v.regex(EMAIL_REGEX, msg('validation.emailInvalid')),
  );
}
