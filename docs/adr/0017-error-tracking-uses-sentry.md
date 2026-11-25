# Error tracking uses Sentry

## Status

Accepted

## Context

The app had no error tracking. Most errors are caught before they crash anything: TanStack Query keeps them on `query.error` and `mutation.error`, and `ignoreFailure` swallows best-effort work. So a broken Intervals.icu response or a parse bug stayed invisible. Most of the app's logic is JavaScript, and most releases reach athletes as OTA updates. The app avoids paid services where a free plan is good enough.

## Decision

- The mobile app reports errors to Sentry through `@sentry/react-native` and its Expo config plugin, on Sentry's free Developer plan: one seat, about 5,000 errors a month.
- One Sentry project. Each event is tagged with `APP_ENV` (`dev`, `staging`, `production`) as its environment.
- Release builds send events. `__DEV__` with Metro doesn't, and neither does the `e2e` build. A build whose `EXPO_PUBLIC_SENTRY_DSN` is missing or not an `https` URL, such as the `off` the `e2e` build sets, has Sentry off.
- Errors only: no tracing, no Session Replay, no profiling.
- Events name the athlete by Firebase uid only. No email, no IP (`sendDefaultPii: false`). Tokens, OAuth codes and `Authorization` headers are scrubbed, and response bodies aren't attached.
- Source maps are uploaded for EAS builds and for OTA updates. A failed upload warns in the run and doesn't block the release.
- Cloud Functions stay out. Their `console.error` logs already reach Cloud Logging and Error Reporting.

### Considered and rejected

- **Firebase Crashlytics:** free, and React Native Firebase is already installed. But JavaScript errors only arrive as non-fatals with no source-map symbolication, and JavaScript is where most of the app's bugs live.
- **EAS Observe error reporting:** fits EAS Update well, but it's in preview, records no ANRs or out-of-memory terminations, and can't map Android R8 frames yet.

## Consequences

- `@sentry/react-native` is a native module, so it changes the fingerprint and first ships in a store build.
- A second person reviewing errors needs Sentry's paid Team plan.
- The App Store privacy labels and Google Play Data safety form must list crash and diagnostic data linked to a user id.
- The DSN reaches the app bundle, so it isn't secret. Sentry has no inbound filter that accepts events only from given bundle IDs, so a stranger could spend the event quota. If that happens, filter their IP or rotate the DSN.
