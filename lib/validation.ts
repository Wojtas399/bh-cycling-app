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

export function emailField() {
  return v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(msg('validation.emailRequired')),
    v.regex(EMAIL_REGEX, msg('validation.emailInvalid')),
  );
}
