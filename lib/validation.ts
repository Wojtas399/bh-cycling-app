import type { ParseKeys } from 'i18next';
import * as v from 'valibot';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function msg(key: ParseKeys): string {
  return key;
}

export function requiredString(requiredKey: ParseKeys) {
  return v.pipe(v.string(), v.nonEmpty(msg(requiredKey)));
}

export function newPasswordField(
  requiredKey: ParseKeys = 'validation.passwordRequired',
) {
  return v.pipe(
    v.string(),
    v.nonEmpty(msg(requiredKey)),
    v.minLength(MIN_PASSWORD_LENGTH, msg('validation.passwordTooShort')),
  );
}

type ForwardPath<
  T extends Record<string, unknown>,
  K extends keyof T & string,
> = Parameters<typeof v.forward<T, v.CheckIssue<T>, [K]>>[1];

function keyOfInputAsForwardPath<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(key: K): ForwardPath<T, K> {
  return [key] as ForwardPath<T, K>;
}

export function passwordsMatch<
  T extends Record<string, unknown>,
  P extends keyof T & string = keyof T & string,
  C extends keyof T & string = keyof T & string,
>(password: P, confirm: C) {
  return v.forward<T, v.CheckIssue<T>, [C]>(
    v.check(
      input => (input[confirm] as unknown) === input[password],
      msg('validation.passwordsMismatch'),
    ),
    keyOfInputAsForwardPath<T, C>(confirm),
  );
}

export function emailField() {
  return v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(msg('validation.emailRequired')),
    v.regex(EMAIL_REGEX, msg('validation.emailInvalid')),
  );
}
