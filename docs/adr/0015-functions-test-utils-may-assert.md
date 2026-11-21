# `functions/test-utils/` may assert

## Status

Accepted (Spec #462)

## Context

ADR 0014 bans type assertions and says that adding a file to its allowlist needs a new ADR. Spec #462 extends the ban to `functions/`, tests included. The Cloud Functions handler tests each build a `CallableRequest` by hand. That type needs `rawRequest`, an Express request the handlers never read, and `auth.token`, a full `DecodedIdToken`. The tests need a token without `auth_time`, to cover a stale or missing sign-in. Neither can be built honestly without an assertion.

## Decision

- **The allowlist grows by one path.** `functions/test-utils/**` may assert, alongside `lib/typed.ts` and `test-utils/**`. `functions/eslint.config.js` turns `@typescript-eslint/consistent-type-assertions` off for that folder only.
- **What lives there.** Fakes for library types that the Cloud Functions tests need, starting with `callableRequest(data, caller?)`. It asserts in two places: the unread `rawRequest` stub, and the partial claims cast to `DecodedIdToken`.
- **It stays out of the deploy.** The folder sits outside `functions/src`, so `tsconfig.build.json` never compiles it, and `firebase.json` ignores it. The type-check config, `tsconfig.json`, does cover it.
- **The rest of ADR 0014 holds.** No disable directive may name the rule, and tests in `functions/src/**/__tests__` may not assert.

## Considered Options

- **Using root `test-utils/`.** `functions/` is its own package, with its own `tsconfig`, Jest roots and dependencies. Importing from the app's folder would break that boundary.
- **A complete fake `rawRequest` and a full `DecodedIdToken`.** This means a large Express request object that nothing reads, plus filling in every required claim. A test then can't leave `auth_time` out, and that case is the one the test exists to cover.
- **A wrapper in `functions/src`.** That would ship test-only code with the deployed functions.
