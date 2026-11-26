# The device reads the Intervals.icu token and calls Intervals.icu itself

## Status

Accepted

## Context

The Intervals.icu access token sits in Firestore in plain text, and the athlete's own device reads it and calls the Intervals.icu API directly. The token carries no expiry and no refresh token, so a leaked token works until it is revoked. A security review weighed whether the token should never leave the server.

## Decision

The token stays where it is. Only a Cloud Function writes it, the owner alone can read it, the scopes are read-only, and disconnecting or deleting the account revokes it on Intervals.icu. GDPR Article 32 asks for security fit for the risk. A read-only token for one athlete, on a device already signed in as that athlete, meets that bar.

- The OAuth flow uses PKCE, so an app that intercepts the redirect to the custom scheme can't redeem the code through our function under another account.
- No log line, Sentry event or data export carries the token.
- Only the controller has access to the Firebase projects.

### Considered and rejected

- **Proxying every Intervals.icu call through Cloud Functions:** the token never reaches the device, but every screen refresh becomes several function calls. That means cold starts, a real risk of leaving the free tier, and rewriting the whole API layer against ADR 0005. It mostly protects against someone holding an unlocked, signed-in phone, who sees the data in the app anyway.
- **Encrypting the token in Firestore:** the device needs the token in plain text, so the key would have to reach the device too.

## Consequences

Anyone with admin access to a Firebase project can read every athlete's token. The privacy policy says the token is stored in Firebase and used only to read the athlete's data from Intervals.icu.
