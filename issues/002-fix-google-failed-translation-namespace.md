# Fix googleFailed translation key namespace

## Type

AFK

## What to build

Move the `googleFailed` translation key from `signUp.validation` to `signUp.errors` in `i18n/locales/pl.ts`, and update the reference in `useSignUp.ts` to match. `validation` keys should only cover form field validation; auth/runtime errors belong under `errors`.

## Acceptance criteria

- [ ] `googleFailed` is defined under `signUp.errors` in `pl.ts`, not `signUp.validation`
- [ ] `useSignUp.ts` references `signUp.errors.googleFailed`
- [ ] No other code references `signUp.validation.googleFailed`

## Blocked by

None — can start immediately

## Status

Done
