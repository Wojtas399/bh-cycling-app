# Google sign-up

## Type

AFK

## What to build

Extend `useSignUp` with a `handleGoogleSignIn` handler and a `googleLoading` boolean flag. The implementation follows the same flow already used in `useSignIn`: `GoogleSignin.hasPlayServices()` → `GoogleSignin.signIn()` → build a credential → `auth().signInWithCredential(credential)`. A cancelled flow (`statusCodes.SIGN_IN_CANCELLED`) is silently ignored. Both `loading` and `googleLoading` contribute to the existing `disabled` boolean so neither button can be tapped while any async operation is in progress.

On the Sign Up screen, add the "lub" divider and a "Zarejestruj się przez Google" secondary `Button` (outline style, matching the Sign In screen's Google button). While `googleLoading` is true the button shows a loading indicator. Successful Google sign-up is handled automatically by the existing auth state listener.

## Acceptance criteria

- [ ] A "Zarejestruj się przez Google" button renders below the "lub" divider
- [ ] Tapping the Google button initiates the Google Sign-In flow
- [ ] A loading indicator is shown inside the Google button while the flow is in progress
- [ ] Both the submit button and the Google button are disabled while either loading flag is active
- [ ] Cancelling the Google sign-in sheet dismisses silently with no error shown
- [ ] A failed Google sign-in (non-cancellation error) shows a descriptive error message
- [ ] Successful Google sign-up automatically navigates to the authenticated area

## Blocked by

- `002-email-password-sign-up-form.md`

## Status

Done
