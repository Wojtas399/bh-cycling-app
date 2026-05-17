# Harden sign-up form UX during loading state

## Type

AFK

## What to build

Tighten the sign-up form so it fully prevents interaction and accidental re-submission while a sign-up request is in flight. Also clean up two minor inconsistencies in `useSignUp.ts`: rename `handleGoogleSignIn` to `handleGoogleSignUp`, and clear the global `error` banner whenever the user edits any field.

## Acceptance criteria

- [x] All three Input fields have `editable={!disabled}` so they cannot be edited while loading
- [x] `onSubmitEditing` on the confirm password field is guarded: `() => { if (!disabled) handleSignUp(); }`
- [x] `handleGoogleSignIn` is renamed to `handleGoogleSignUp` in `useSignUp.ts` and updated in `sign-up.tsx`
- [x] `onEmailChange`, `onPasswordChange`, and `onConfirmPasswordChange` each clear the global `error` state in addition to their field-level error

## Blocked by

None — can start immediately

## Status

Done
