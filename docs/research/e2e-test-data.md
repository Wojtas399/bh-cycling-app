# Research: real staging or emulators for e2e data

Answers #272 (part of map #270). Researched 2026-11-06 against this repo at `ccc6b88` and the primary sources cited inline. Nothing in the app was changed.

**Recommendation:** run the first suite against **real staging**: the `bh-cycling-staging` Firebase project plus a dedicated Intervals.icu test athlete. Make it stable with a **seed script that runs before every suite**, which uses the test athlete's personal API key to rewrite that athlete's Workouts at dates relative to today. Don't use emulators or stubs for now. They cost more to set up, need app code changes, and hide the failures this app has actually had, which come from the real Intervals.icu API.

---

## 1. Can `@react-native-firebase` point at the Emulator Suite?

Yes, for all three modules. Each has a JS `useEmulator` method, and the installed v24.0.0 source shows how it works:

- **Auth**: `auth().useEmulator('http://localhost:9099')` takes a URL string. Source: `node_modules/@react-native-firebase/auth/lib/index.js`, line 491.
- **Firestore**: `firestore().useEmulator('localhost', 8080)` takes a host and a port. Its typings say: _"This must be called before any other calls to Firebase Firestore to take effect."_ Source: `firestore/lib/namespaced.ts`, line 208, and `firestore/lib/types/namespaced.ts`, line 2546.
- **Functions**: `functions().useEmulator('localhost', 5001)`. Source: `functions/lib/namespaced.ts`, line 403.
- **Android**: on Android all three rewrite `localhost` and `127.0.0.1` to `10.0.2.2`, which is how the emulator reaches the host machine. A `firebase.json` flag, `android_bypass_emulator_url_remap`, turns this off. The iOS simulator shares the host's network, so `localhost` works there as is.
- **Cleartext traffic** is already allowed in the dev build's native config:
  - Android: `android:usesCleartextTraffic="true"` in `android/app/src/debug/AndroidManifest.xml`.
  - iOS: `NSAllowsLocalNetworking` in `ios/BHCyclingStaging/Info.plist`.
- **Default ports** are Auth 9099, Firestore 8080, Functions 5001 and UI 4000. The emulators need Java JDK 11 or newer and firebase-tools 8.14 or newer. Seeding uses `--import=<dir>` and `emulators:export` or `--export-on-exit`. Source: https://firebase.google.com/docs/emulator-suite/install_and_configure

**The switch it would take.** Today `lib/firebase.ts` only re-exports the default modules. Nothing calls `useEmulator`, `firebase.json` has no `emulators` block, and `app.config.ts` only branches on `APP_ENV` for the bundle id and the Google services file. The smallest switch would be:

- **Env var**: an `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` that Metro inlines at bundle time. It's JS-only, so it needs no native rebuild and no new `APP_ENV` value.
- **Code**: an `if` in `lib/firebase.ts` that calls the three `useEmulator`s before anything else touches Firebase. It has to come before `useIntervalsConnection`'s first `onSnapshot`.
- **Project id**: the emulators must start with `--project bh-cycling-staging`, the project id the staging plist and json carry (`.firebaserc`). Otherwise the app and the seed data end up in different emulator namespaces.

**What else the emulator path needs:**

- **Auth user.** The emulator creates email/password users from its UI, the SDK or REST. Verification links are printed to the terminal (https://firebase.google.com/docs/emulator-suite/connect_auth). The app sends unverified users to `/(auth)/verify-email` (`app/(app)/_layout.tsx`), so the seed must create the user with `emailVerified: true`.
- **Firestore integration doc.** `firestore.rules` forbids client writes to `users/{uid}/integrations/intervals`, so the doc has to be seeded with the Admin SDK or with `--import`.
- **Functions.** By default the emulator tries to read `INTERVALS_CLIENT_ID` and `INTERVALS_CLIENT_SECRET` from Secret Manager. A `.secret.local` file overrides them (https://firebase.google.com/docs/functions/config-env). None of the three first-suite flows calls a function, so the Functions emulator is optional at first. A sign-out test calls none.

## 2. How the app gets an Intervals.icu token, and whether a test account can skip OAuth

**Today's flow:**

1. `hooks/useIntervalsAuth.ts` opens `https://intervals.icu/oauth/authorize` through `expo-auth-session`. It asks for the scope `ACTIVITY:READ,CALENDAR:READ` and uses no PKCE.
2. The authorization code goes to the callable function `exchangeIntervalsToken`.
3. That function (`functions/src/intervals/exchangeToken.ts`) POSTs to `https://intervals.icu/api/oauth/token` and writes `{accessToken, athleteId, athleteName, scope, connectedAt}` to `users/{uid}/integrations/intervals`.
4. `hooks/useIntervalsConnection.ts` subscribes to that doc. `useIntervalsAvailability` hands the credentials to the queries.
5. `lib/intervalsApi.ts` sends every request with `Authorization: Bearer <token>` to `https://intervals.icu/api/v1`. That base URL is the hard-coded constant `INTERVALS_API_BASE_URL` in `lib/intervalsApiPaths.ts`.

**The token can be long-lived:**

- Intervals.icu "doesn't use refresh tokens, only access tokens". A new authorization "replaces whatever token might already exist" (david, maintainer). Source: https://forum.intervals.icu/t/intervals-icu-oauth-support/2759
- No expiry is documented. One 2022 forum report of a 403 after a few hours went unanswered, and another developer reports never having to re-authorize. The app is built on the same assumption: it stores no refresh token and only reacts to a 401 (`needsReconnect`, ADR 0005).
- So **one manual OAuth connect** from the staging app, signed in as the e2e Firebase user, leaves a token in staging Firestore that every later test run reuses. No test performs an OAuth step.
- **Caveat:** if anyone connects the same test athlete to the app again, on any device, the stored token is replaced and the old one stops working. Keep the test athlete for e2e only.

**A personal API key can't stand in for that token without an app change:**

- API keys use HTTP **Basic** auth, _"The username is "API_KEY" and the password your API key"_ (https://forum.intervals.icu/t/api-access-to-intervals-icu/609). You generate one under `/settings` → Developer Settings.
- The app only ever sends `Bearer`. Writing an API key into the Firestore `accessToken` field would mean a code path in `request()` that is never used in production.
- The API key's real job is the **seed script**, which runs outside the app (see §3).

## 3. A separate test athlete, and keeping its data stable

**Account.** Intervals.icu is free to sign up for. Nothing found in its docs or forum forbids a second athlete account. The API can't create accounts ("The one thing I can't do via the API is create the accounts themselves", https://forum.intervals.icu/t/provisioning-intervals-accounts-for-a-clubs-athletes-minimal-athlete-friction/130761), so one manual sign-up is needed. Two practical limits:

- Do **not** link Strava. A Strava account can link to only one Intervals.icu athlete. Also, Strava-sourced Activities come back through the API as stubs with no details (`CONTEXT.md`, "Strava Activity").
- Create the test Activities natively, either uploaded FIT files or manual Activities (see below).

**The API can seed it.** The endpoints are in the OpenAPI docs at https://intervals.icu/api/v1/docs:

- `POST /api/v1/athlete/{id}/events/bulk?upsert=true` creates Workouts and Notes, updating any that match on `external_id`.
- `DELETE /api/v1/athlete/{id}/events?oldest=…&category=…` deletes a date range.
- `PUT /api/v1/athlete/{id}/events/bulk-delete` deletes by `id` or `external_id`.
- `POST /api/v1/athlete/{id}/activities` uploads a FIT, TCX or GPX file and takes a `paired_event_id`. `POST /api/v1/athlete/{id}/activities/manual` and `/manual/bulk` (upsert on `external_id`) create manual Activities.
- Event dates are local and must end in `T00:00:00` (forum thread 609).

**Rate limits are not a concern:**

- API key: 5,000 requests a day and 2,500 per rolling 15 minutes.
- OAuth app: the "100/user per day" figure is used to calculate the app's total and "is not applied per-user", and the total has a minimum of 5,000 a day.
- Everyone: 10 requests a second per IP, with HTTP 429 and `Retry-After` beyond that.
- Source: forum thread 609. A suite run makes a few dozen reads.

**Why a one-off seed won't stay stable.** Workout Status is derived at read time from today's date (`lib/workoutStatus.ts`, `CONTEXT.md`, ADR 0005). On top of that, Home's "Dziś i jutro" only shows **today and tomorrow** (`lib/upcomingWorkouts.ts`). A Workout seeded once on a fixed date drops off Home the next day and turns `missed` in the Calendar. Flow 1 (open a Workout from Home) would then fail.

**The fix is a seed step that runs before every suite**, using the API key and Basic auth:

1. Upsert, by fixed `external_id`, a structured Cycling Workout dated **today** and another dated **tomorrow**. Give them steps (`workout_doc`), so Workout Details has a Workout Profile to draw. Add a Workout or two in the previous and next month for flow 2.
2. Delete earlier e2e events that have moved into the past, or leave them. They render as `missed`, which is also a state worth seeing.
3. Optionally keep one natively uploaded Activity that is paired to a past Workout, so `completed` and Activity Details are covered later.

The suite's assertions should then name the seeded Workout ("Workout E2E – today"), not a date or a count. The seed is idempotent and takes seconds.

**To verify when building:**

- Whether `upsert` on `external_id` applies to events created with an API key. The docs only say it matches events "from the same OAuth app".
- If it doesn't, delete by date range and re-create instead.

## 4. What stubbing Intervals.icu would mean

| Option                             | How                                                                                                                                                                                                                                                                              | App code touched                                                                                                                                           | What it skips                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Fake base URL**                  | Read `INTERVALS_API_BASE_URL` from an `EXPO_PUBLIC_` env var, and run a local HTTP server that serves date-shifted JSON fixtures for each endpoint the app calls: `/athlete/0`, `/athlete/{id}/events`, `/events/{id}`, `/athlete/{id}/activities`, `/activity/{id}` and `/map`. | About one line in `lib/intervalsApiPaths.ts`, plus a fake server and fixtures to maintain. Android reaches it at `10.0.2.2`. Cleartext is already allowed. | The real API's shape and quirks.                |
| **MSW in the app**                 | `msw/native` `setupServer` started at app entry behind an env flag, with polyfills (URL, TextEncoder).                                                                                                                                                                           | Entry wiring in `app/_layout.tsx`, new runtime dependencies, and handlers in the JS bundle.                                                                | The same as above, plus the real `fetch` stack. |
| **Fixtures behind TanStack Query** | Swap the `queryFn`s in `lib/intervalsQueries.ts`, alias `lib/intervalsApi.ts`, or prefill with `setQueryData`.                                                                                                                                                                   | The most: every `queryOptions` or a module alias. It bypasses `request()`, the 401 handling and much of the fetch-and-join path.                           | Nearly everything below the screens.            |

Each option also still needs a seeded Firestore integration doc, since the gate reads it. Each also needs fixtures rewritten to today's date, for the same Workout Status reason as §3.

## 5. Which choice hides the fewest real failures for the three first-suite flows

1. **Sign in → "Dziś i jutro" → Workout → Workout Details profile.** This flow exercises staging Auth (including `emailVerified`), the Firestore rules on the integration doc, the stored token, and the real `events`, `activities`, `athlete/0` and single-event endpoints, plus pairing and profile building. This app's bugs have come from how the real API behaves:
   - The single event read lacks `paired_activity_id` (#191, comment in `workoutDetailsQueryOptions`).
   - Strava Activities come back as stubs.
   - `name` and `description` on Notes can be `null`, `""` or missing.

   A stub only reproduces what someone already knew to put in a fixture. **Real staging hides the fewest failures.**

2. **Calendar month navigation.** The same reads, a month at a time, and the same conclusion. Stubbed months would also need fixtures for every month the test steps through.
3. **Settings sign-out.** Auth only. Both setups cover it equally.

Emulators would also hide staging configuration failures: the `GoogleService-Info` and `google-services` files, deployed `firestore.rules`, and the deployed function. Real staging catches those.

## Cost of each

**Real staging plus a test athlete:**

- **One-off:**
  - Create the Firebase email/password user and verify its email.
  - Sign up the Intervals.icu athlete with no Strava link.
  - Connect it once through the staging app.
  - Generate an API key and keep it in `.env.local` or `eas env`.
  - Write a seed script of roughly 100 lines of Node, using `fetch` and Basic auth.
- **Ongoing:**
  - The suite needs network access and Intervals.icu up.
  - It breaks if someone reconnects the test athlete elsewhere.
  - Run the seed before each suite. It's idempotent.
- **App changes:** none.

**Emulators plus an Intervals stub:**

- **One-off:**
  - JDK 11 or newer, and an `emulators` block in `firebase.json`.
  - The env switch and `useEmulator` calls in `lib/firebase.ts`.
  - Seed data for Auth and Firestore via `--import`.
  - `.secret.local` if functions are emulated.
  - The configurable base URL, and a fake server or MSW with fixtures for every endpoint, date-shifted to today.
- **Ongoing:**
  - Keep the fixtures in line with the real API by hand. Every new endpoint or field needs a new fixture.
  - The suite runs offline and is deterministic.
- **App changes:** `lib/firebase.ts` and `lib/intervalsApiPaths.ts`, plus entry wiring if you use MSW. That is production code that exists only for tests.

**When to revisit:** CI (still in the fog on #270), where flaky network calls and shared credentials get worse. The cheapest emulator-shaped step would be the fake base URL alone. It isn't needed for running by hand before an `rc/` is cut.
