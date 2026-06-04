# `verify-email` screen + `useVerifyEmail` hook

## Type

AFK

## What to build

Create `app/(auth)/useVerifyEmail.ts` and `app/(auth)/verify-email.tsx`. The hook owns all logic; the screen is purely presentational and mirrors the `forgotPassword` success screen pattern.

**Hook (`useVerifyEmail`):**

- On mount: calls `sendEmailVerification` on `auth().currentUser` and starts a 60-second countdown interval (stored in a ref, cleaned up on unmount).
- `handleVerified`: calls `user.reload()`, reads `user.emailVerified`; navigates to `/(app)` if true, sets an error message if false.
- `handleResend`: calls `sendEmailVerification` again and resets the 60-second cooldown.
- `handleSignOut`: calls `auth().signOut()`.
- Exposes: `email` (from `currentUser`), `loading`, `error`, `cooldown` (seconds remaining, 0 when expired).

**Screen (`verify-email`):**

- Registered as a route in the `(auth)` group (add to `_layout.tsx` if required by the router).
- Displays: icon, title, subtitle with the user's email, "I've verified" button, resend button (disabled and labelled with remaining seconds while cooldown > 0), sign-out text link, and an error message area.

## Acceptance criteria

- [ ] `app/(auth)/useVerifyEmail.ts` exists and exports `useVerifyEmail`
- [ ] On mount, `sendEmailVerification` is called and the 60-second cooldown starts
- [ ] Tapping "I've verified" when email is not yet verified shows the `notVerified` error message
- [ ] Tapping "I've verified" when email is verified navigates to `/(app)`
- [ ] Resend button is disabled while `cooldown > 0` and its label shows the remaining seconds
- [ ] Tapping resend after cooldown expires resends the email and restarts the 60-second timer
- [ ] Tapping sign-out calls `auth().signOut()`
- [ ] Cooldown interval is cleared on unmount (no memory leak)
- [ ] `app/(auth)/verify-email.tsx` exists and renders without errors when navigated to manually
- [ ] The registered email address is visible on the screen
- [ ] All strings are sourced from `pl.verifyEmail.*` translations

## Blocked by

- `001-verify-email-translations.md`

## Status

Done
