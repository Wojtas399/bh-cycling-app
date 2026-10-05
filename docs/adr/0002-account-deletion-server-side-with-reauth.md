# Account deletion runs in one server-side function, gated by a server-enforced recent re-authentication

## Status

Accepted

## Context

App Store guideline 5.1.1(v) and Google Play require apps that offer account creation to let users initiate account deletion in-app, so a support-request (mailto) flow is not an option. A user's data spans the Firebase Auth account, everything under `users/{uid}` in Firestore (today only the Intervals.icu integration doc, which clients cannot write), and the app's OAuth authorization on Intervals.icu.

Firebase's client `user.delete()` enforces a recent-login check, but the Admin SDK's `deleteUser` does not — moving deletion server-side silently drops that protection.

## Decision

Deletion is a single callable Cloud Function, `deleteAccount`, which:

1. Rejects the call unless the ID token's `auth_time` is within the last 5 minutes (`failed-precondition`). The client re-authenticates first (password if the account has the `password` provider, otherwise Google Sign-In) and force-refreshes the ID token before calling.
2. Revokes the app's Intervals.icu authorization via `DELETE /api/v1/disconnect-app` with the stored token, if an integration doc exists. Best-effort: `401` means already disconnected; other failures are logged and do not block deletion.
3. Recursively deletes `users/{uid}`.
4. Deletes the Firebase Auth user.

Auth deletion is last so any partial failure leaves a signed-in user who can simply retry; every step tolerates already-deleted state.

## Consequences

The recent-login requirement is ours to maintain: the `auth_time` check in the function is the only thing enforcing it.

An Intervals.icu outage during deletion can leave the app still listed in the athlete's authorized apps on Intervals.icu (with our copy of the token destroyed); the athlete can remove it manually at intervals.icu/settings/apps. Deletion never touches the athlete's data on Intervals.icu itself.

Any future per-user data must live under `users/{uid}` to be covered by deletion automatically.
