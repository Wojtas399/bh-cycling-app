# Extract shared EMAIL_REGEX to a validation utility

## Type

AFK

## What to build

Remove the duplicated `EMAIL_REGEX` constant from `useSignIn.ts` and `useSignUp.ts` by extracting it into a shared validation utility (e.g. `lib/validation.ts`). Both hooks should import from that single source of truth.

## Acceptance criteria

- [ ] `EMAIL_REGEX` is defined in exactly one place (e.g. `lib/validation.ts`)
- [ ] `useSignIn.ts` imports `EMAIL_REGEX` from the shared utility
- [ ] `useSignUp.ts` imports `EMAIL_REGEX` from the shared utility
- [ ] No duplicate regex definitions remain in the auth hooks

## Blocked by

None — can start immediately

## Status

Done
