# RN Firebase v24 against the Firebase Emulator Suite

Ticket: [#111](https://github.com/Wojtas399/bh-cycling-app/issues/111) · Map: [#108](https://github.com/Wojtas399/bh-cycling-app/issues/108) · Researched 2026-10-15

## Answer

**Yes.** `@react-native-firebase` v24 Auth, Firestore and Functions can each be pointed at the Emulator Suite from an iOS simulator and an Android emulator. RNFB's own repo already does this in CI: its e2e suites start the Firebase emulators and then run Detox on `ubuntu-latest` (Android emulator with KVM) and on a macOS/Xcode runner (iOS simulator) [S1]. The app needs three `connect*Emulator` calls, made once before any Firebase use and behind a bundle-time flag. Release-like builds also need a cleartext-HTTP allowance on Android. The real gaps are the Google Sign-In UI, which is already out of scope in #108, and the Intervals.icu round-trip in `exchangeIntervalsToken`.

## 1. App wiring (RNFB v24 APIs)

Installed versions in this repo: `@react-native-firebase/{app,auth,firestore,functions}` are all `24.0.0` (`node_modules/*/package.json`).

| Service     | v24 modular API                                                                                   | Default port [S5] | Source                                                   |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------- |
| Auth        | `connectAuthEmulator(getAuth(), 'http://localhost:9099')` (namespaced: `auth().useEmulator(url)`) | 9099              | `auth/lib/modular/index.js:117`, `auth/lib/index.js:491` |
| Firestore   | `connectFirestoreEmulator(getFirestore(), 'localhost', 8080)`                                     | 8080              | [S2], `firestore/lib/modular.ts:354`                     |
| Functions   | `connectFunctionsEmulator(getFunctions(), 'localhost', 5001)`                                     | 5001              | [S3], `functions/lib/modular.ts:43`                      |
| Emulator UI | n/a                                                                                               | 4000              | [S5]                                                     |

- **Host addresses: the library remaps them for you.** On Android, all three modules rewrite `localhost`/`127.0.0.1` to `10.0.2.2`, the Android emulator's alias for the host machine. Each logs "Mapping … host … to 10.0.2.2 for android emulators. Use real IP on real devices" (`auth/lib/index.js:497-514`, `firestore/lib/namespaced.ts:213-225`, `functions/lib/namespaced.ts:407-426`). You can turn this off with `"android_bypass_emulator_url_remap": true` in the RNFB section of `firebase.json`. So the app can pass `localhost` on both platforms. The iOS simulator shares the host's network, so `localhost`/`127.0.0.1` works there as-is. Firebase's own native docs use `10.0.2.2` on Android and `127.0.0.1` on iOS [S4][S6].
- **Call the connect functions before the first read or write.** The Firestore docs say: "set these before any read/write operations occur" [S2]. An RNFB maintainer adds: "if you try to set useEmulator _after_ you have already done something non-emulator, it will splat a pretty big error" [S7]. The connection lasts for the app process. A cold restart is needed to switch back to the cloud [S8].
- **The functions region must match.** `connectFunctionsEmulator(getFunctions())` targets the default region. Non-default regions need `getFunctions(getApp(), 'region')` [S3]. Our functions use the v2 `onCall` default (`functions/src/index.ts`) and the app calls `functions().httpsCallable(...)` with the default region, so this already lines up.
- **Device persistence.** Firebase advises disabling local SDK persistence against the emulator so the cache doesn't drift from the emulated DB [S6]. With fresh app state per test, such as clearing app data between flows, this matters less.
- **Real devices** need the host's LAN IP. iOS real-device emulator use is a known problem [S9]. Not needed for CI.

### Platform transport (cleartext HTTP)

The emulators speak plain HTTP.

- **Android:** Expo prebuild only sets `android:usesCleartextTraffic="true"` in the _debug_ manifest (`android/app/src/debug/AndroidManifest.xml` in the local prebuild). The main manifest leaves it unset, so a release build blocks `http://10.0.2.2`. A release-like e2e binary needs `expo-build-properties` → `android.usesCleartextTraffic: true`, scoped to the e2e build only (`expo-build-properties/build/pluginConfig.d.ts:162`).
- **iOS:** The prebuilt `Info.plist` already has `NSAllowsLocalNetworking = true` (local `ios/*/Info.plist`), so HTTP to localhost is allowed.
- An RNFB user found that EAS-built binaries "don't work with the emulators" while local `expo prebuild` builds did [S10]. No root cause was posted. _Inference:_ this fits the release-config cleartext rule above, so it is worth checking first if the e2e build ends up on EAS.

## 2. What this repo would need

Current state: `lib/firebase.ts` only re-exports `auth`, `firestore`, `functions` and configures GoogleSignin. `firebase.json` has `functions` and `firestore.rules` but no `emulators` block. `app.config.ts` selects native config by `APP_ENV` (staging/production). `eas.json` has development/staging/preview/production profiles.

1. **Bundle-time switch.** Add e.g. `EXPO_PUBLIC_FIREBASE_EMULATOR=1` (Metro inlines `EXPO_PUBLIC_*` at bundle time). In `lib/firebase.ts`, when it is set, call the three `connect*Emulator` functions at module top level, before anything else imports the services. Optionally add `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (default `localhost`) for LAN use. Keep it off for every existing EAS profile, so emulator wiring can never reach a production binary.
2. **`firebase.json` `emulators` block** with `auth` 9099, `firestore` 8080, `functions` 5001, `ui` (disable it in CI, as RNFB does [S1]) and possibly `singleProjectMode: true` [S5].
3. **Project ID.** The native config files carry `bh-cycling-staging`. Cross-service emulation, such as Functions reading emulated Auth/Firestore and rules, requires "the project ID in your code must match the Firebase CLI's project ID" [S4]. So the simplest route is `firebase emulators:exec --project bh-cycling-staging …`. The `demo-*` alternative is safer: any call to a non-emulated service fails instead of reaching a real backend [S4]. But it would need a separate fake `GoogleService-Info`/`google-services.json` pair keyed to an `APP_ENV=e2e`. That choice is open for the spec.
4. **Functions in the emulator:**
   - `deleteAccount` and `disconnectIntervals` use `firebase-admin` `getAuth()`/`getFirestore()`. The Functions emulator wires these to the other running emulators automatically [S6]. `deleteAccount`'s `auth_time` ≤ 5 min check works with emulator tokens, because they carry claims but are unsigned [S4].
   - `exchangeIntervalsToken` binds `defineSecret('INTERVALS_CLIENT_ID'/'INTERVALS_CLIENT_SECRET')`. The emulator reads overrides from `functions/.secret.local`, so no Secret Manager access is needed: "override secrets values by setting up a .secret.local file … if you don't have access to the secret value" [S11]. Non-secret env overrides go in `.env.local` [S11]. The function still makes a _real_ outbound call to intervals.icu with an OAuth code, which hangs on the Intervals strategy (#113), not on the emulator.
   - The functions must be built first (`npm --prefix functions run build`), since `firebase.json` predeploy only runs on deploy.
5. **CI.**
   - The Emulator Suite needs Java JDK ≥ 11, Node ≥ 16 and the Firebase CLI [S5]. RNFB uses `actions/setup-java` with Java 21 [S1].
   - Use `firebase emulators:exec "<test script>"` ("generally better suited to CI") [S5].
   - Cache `~/.cache/firebase/emulators/` [S5]. RNFB caches exactly this path [S1].
   - No login or token is needed for Auth/Firestore/Functions; only Hosting requires one [S5].
   - The emulators run on the same runner as the simulator/emulator, so `localhost`/`10.0.2.2` work unchanged.

## 3. Known limitations

| Area                   | Emulator behaviour                                                                                                                                                                                                                                                                                                                    | Impact here                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Sign-In         | The native GoogleSignin UI still talks to real Google. The Auth emulator does accept `signInWithCredential(GoogleAuthProvider.credential('{"sub": "abc123", "email": "foo@example.com", "email_verified": true}'))`, a literal JSON string in place of the ID token, for any JWT-style IdP. Access-token IdPs are not supported [S4]. | Driving the Google UI is already out of scope (#108). A test-only bypass would need an app hook, which is not black-box.                                      |
| Email verification     | No email is sent. The link is printed to the emulator terminal. Tests fetch codes from `GET http://localhost:9099/emulator/v1/projects/{project-id}/oobCodes` [S4][S12]. Admin SDK via `FIREBASE_AUTH_EMULATOR_HOST` can also set `emailVerified` directly [S4].                                                                      | The app gates on `user.emailVerified` (`app/index.tsx`, `app/(app)/_layout.tsx`), so test users must be seeded as verified, or verified via the oobCode link. |
| Password reset         | The link is printed with a `newPassword` param; same `oobCodes` endpoint [S4][S12].                                                                                                                                                                                                                                                   | Forgot-password flow is testable without inbox access.                                                                                                        |
| Tokens                 | Emulator ID tokens are unsigned and rejected by production services [S4].                                                                                                                                                                                                                                                             | Fine as long as everything is emulated.                                                                                                                       |
| Phone auth / reCAPTCHA | Not supported [S4].                                                                                                                                                                                                                                                                                                                   | Not used.                                                                                                                                                     |
| Data reset             | Auth: `DELETE /emulator/v1/projects/{id}/accounts` [S12]. Firestore: `DELETE http://localhost:8080/emulator/v1/projects/{id}/databases/(default)/documents` [S2]. Firestore also clears on shutdown [S6]. Seed with `--import=<dir>` [S5].                                                                                            | Cheap per-run or per-test isolation.                                                                                                                          |
| Functions credentials  | Admin access to non-emulated Google APIs needs `GOOGLE_APPLICATION_CREDENTIALS` [S13].                                                                                                                                                                                                                                                | Only matters if something isn't emulated, such as Intervals revoke calls going outbound.                                                                      |

## 4. Staging-project alternative (`bh-cycling-staging`)

No app code changes are needed: the current staging builds work as-is. What it would take:

- **Dedicated test accounts.** Use pre-created email/password users, verified once, with credentials in CI secrets. Sign-up tests need unique addresses per run, plus a cleanup job, e.g. a scheduled Admin SDK script that deletes `e2e+*@…` users and their `users/{uid}` docs.
- **Shared mutable state.** Parallel PR runs hit the same project. Per-run namespaced users are needed to avoid cross-talk. Firestore data also persists between runs.
- **Rate limits** (Auth, [S14]):
  - New accounts: 100/hour per IP.
  - Address verification emails: 1000/day (Spark), 100,000/day (Blaze).
  - Password reset emails: 150/day (Spark), 10,000/day (Blaze).
  - Account deletion: 10/s.
  - Limits "can change without notice" and abuse protection can kick in silently [S14].
- **Real email.** Verification and reset would need a real inbox (or a mail-testing service) or the Admin SDK to read or set state. That makes them non-black-box either way.
- **Functions** run the deployed staging code with real secrets, so the tests also check the deploy. But PR changes to `functions/` aren't exercised until deployed.
- **Cost/flake.** Real network latency, staging outages, and billable usage on Blaze.

## Open questions for the spec

- Should the emulator project be `bh-cycling-staging` (simplest) or a `demo-*` project with an `e2e` native config (safer)?
- Is the e2e binary debug or release-like? That decides whether `usesCleartextTraffic` is needed. On EAS vs local build, see [S10].
- Is a test-only Google credential hook worth having, or does Google sign-in stay manual-only?

## Sources

- [S1] RNFB CI workflows: [tests_e2e_android.yml](https://github.com/invertase/react-native-firebase/blob/main/.github/workflows/tests_e2e_android.yml), [tests_e2e_ios.yml](https://github.com/invertase/react-native-firebase/blob/main/.github/workflows/tests_e2e_ios.yml), [start-firebase-emulator.sh](https://github.com/invertase/react-native-firebase/blob/main/.github/workflows/scripts/start-firebase-emulator.sh)
- [S2] RNFB docs, [Cloud Firestore Emulator](https://rnfirebase.io/firestore/emulator) ([source](https://github.com/invertase/react-native-firebase/blob/main/docs/firestore/emulator.mdx))
- [S3] RNFB docs, [Functions: Using an emulator](https://rnfirebase.io/functions/usage) ([source](https://github.com/invertase/react-native-firebase/blob/main/docs/functions/usage/index.mdx))
- [S4] Firebase, [Connect your app to the Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [S5] Firebase, [Install, configure and integrate Local Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure)
- [S6] Firebase, [Connect your app and start prototyping](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)
- [S7] RNFB issue [#8049](https://github.com/invertase/react-native-firebase/issues/8049), maintainer comments
- [S8] RNFB issue [#8811](https://github.com/invertase/react-native-firebase/issues/8811), maintainer comment
- [S9] RNFB issue [#8060](https://github.com/invertase/react-native-firebase/issues/8060)
- [S10] RNFB [#8049 comment](https://github.com/invertase/react-native-firebase/issues/8049#issuecomment-2409087900): EAS builds vs local prebuild
- [S11] Firebase, [Configure your environment (Functions)](https://firebase.google.com/docs/functions/config-env): `.env.local`, `.secret.local`
- [S12] Firebase, [Auth REST API: Auth emulator endpoints](https://firebase.google.com/docs/reference/rest/auth#section-auth-emulator-oob)
- [S13] Firebase, [Run functions locally](https://firebase.google.com/docs/functions/local-emulator)
- [S14] Firebase, [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits)
- Local package source: `node_modules/@react-native-firebase/{auth,firestore,functions}` v24.0.0, files cited inline.
