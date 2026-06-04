# `verifyEmail` translations namespace

## Type

AFK

## What to build

Add a `verifyEmail` key block to `i18n/locales/pl.ts` covering all strings needed by the verify-email screen: title, subtitle (with `{{email}}` interpolation), "I've verified" button label, resend button label (with `{{seconds}}` interpolation for the cooldown state), sign-out link label, and error messages (not yet verified, network failed, generic).

## Acceptance criteria

- [ ] `pl.verifyEmail.title` exists
- [ ] `pl.verifyEmail.subtitle` contains `{{email}}` interpolation placeholder
- [ ] `pl.verifyEmail.verifiedButton` exists
- [ ] `pl.verifyEmail.resendButton` exists with `{{seconds}}` interpolation placeholder for cooldown state
- [ ] `pl.verifyEmail.signOut` exists
- [ ] `pl.verifyEmail.errors.notVerified` exists
- [ ] `pl.verifyEmail.errors.networkFailed` exists
- [ ] `pl.verifyEmail.errors.generic` exists
- [ ] TypeScript compilation passes (`as const` type is satisfied)

## Blocked by

None — can start immediately

## Status

Done
