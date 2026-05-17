# Email/password sign-up form

## Type

AFK

## What to build

Implement the `useSignUp` hook and render the full email/password registration form on the Sign Up screen. The hook owns all state: `email`, `password`, `confirmPassword` field values; per-field error strings (`emailError`, `passwordError`, `confirmPasswordError`); a general `error` string for Firebase-level failures; a `loading` boolean; and a `disabled` boolean. Client-side validation runs on submit — email must be non-empty and match the standard email regex, password must be non-empty and at least 8 characters, confirmPassword must be non-empty and equal to password. Errors clear on each keystroke in the relevant field. On successful validation, call `createUserWithEmailAndPassword`; the existing auth state listener handles the redirect automatically. Map Firebase error codes `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, and `auth/network-request-failed` to descriptive strings; all others fall back to a generic message.

The screen renders three `Input` fields (email, password, confirm password) with inline error labels beneath each, password-visibility toggles on both password fields using `Ionicons` `eye`/`eye-off` (visibility state lives in the component, not the hook), a general error banner above the submit button, and a "Zarejestruj się" primary `Button` that shows a loading indicator while `loading` is true. Both buttons are disabled and visually dimmed when `disabled` is true.

## Acceptance criteria

- [ ] Email, password, and confirm password fields render with correct labels
- [ ] Eye toggle on the password field shows/hides the entered text
- [ ] Eye toggle on the confirm password field shows/hides the entered text independently
- [ ] Submitting with any empty field shows the appropriate inline validation error and does not call Firebase
- [ ] Submitting with an invalid email format shows an inline email error
- [ ] Submitting with a password shorter than 8 characters shows an inline password error
- [ ] Submitting when confirm password does not match password shows an inline confirm-password error
- [ ] Typing in a field with an existing error clears that error immediately
- [ ] A valid submission calls `createUserWithEmailAndPassword` and shows a loading indicator on the button
- [ ] `auth/email-already-in-use` shows a descriptive error message
- [ ] `auth/weak-password` shows a descriptive error message
- [ ] `auth/network-request-failed` shows a descriptive error message
- [ ] Any other Firebase error shows the generic error message
- [ ] The submit button is disabled while loading
- [ ] Successful registration automatically navigates to the authenticated area (no manual navigation needed)

## Blocked by

- `001-sign-up-route-skeleton.md`

## Status

Done
