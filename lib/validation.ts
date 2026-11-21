import i18n, { type ParseKeys, exists } from 'i18next';
import * as v from 'valibot';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function msg(key: ParseKeys): string {
  return key;
}

export function isTranslationKey(message: string): message is ParseKeys {
  return (
    exists(message) &&
    i18n.languages.some(
      language =>
        typeof i18n.getResource(language, 'translation', message) === 'string',
    )
  );
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
