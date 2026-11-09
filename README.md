# BH Cycling

Expo (SDK 54) app with [Expo Router](https://docs.expo.dev/router/introduction/), a [development client](https://docs.expo.dev/develop/development-builds/introduction/), and React Native Firebase. This is not a plain Expo Go project: native modules require a **dev build** on a simulator or device.

## Prerequisites

- **Node.js** (current LTS recommended) and npm
- **iOS:** Xcode and Command Line Tools (for the simulator and `expo run:ios`)
- **Android:** Android Studio, SDK, and an emulator or USB device (for `expo run:android`)
- Optional: [EAS CLI](https://docs.expo.dev/build-reference/eas-cli/) (`npm i -g eas-cli`) if you pull environment config from EAS

## Install dependencies

```bash
npm install
```

## Environment and Firebase

`APP_ENV` selects staging vs production bundles and Firebase files. It defaults to **`staging`** if unset.

To sync secrets from EAS into `.env.local` (requires `eas login` and access to the Expo project):

```bash
npm run env:staging
# or
npm run env:production
```

At build time, `app.config.ts` can copy Firebase config from paths in those env vars into `firebase/`. If you already have the plist and `google-services` files under `firebase/`, you can develop without running the env scripts.

## Run the app for development

**1. Start the Metro bundler** (keep this terminal open). Same as `npx expo start`; use the Dev Tools UI to clear cache and open logs.

```bash
npm start
```

**2. Run a native dev build** (first run compiles native code; later runs are faster). Use a second terminal while Metro is running, or press `i` / `a` in the Expo CLI once a dev client is already installed.

- iOS Simulator: `npm run ios`
- Android emulator or device: `npm run android`

After the dev client is installed on the simulator or emulator, you usually only need `npm start` and launch the app; it connects to Metro.

Expo Go does **not** include this app’s native Firebase stack. Use the dev client from `expo run:ios` / `expo run:android` (or a prebuilt development build from EAS).

## Other scripts

| Script                                              | Purpose                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run lint`                                      | ESLint via Expo config                                                      |
| `npm run ios:prebuild` / `npm run android:prebuild` | Regenerate native projects (`expo prebuild --clean`)                        |
| `npm run e2e:ios` / `npm run e2e:android`           | Run the e2e suite on the dedicated simulator or emulator (`docs/e2e.md`)    |
| `npm run reset-project`                             | Moves starter `app` code to `app-example` and gives a blank `app` directory |

## Cloud Functions (`functions/`)

A separate TypeScript project deployed independently from the app. It has its own `package.json`, dependencies, and test suite.

```bash
cd functions
npm install
npm run build   # compile TypeScript to lib/
npm test        # run the Jest suite
```

Two Firebase projects are registered as aliases in the root `.firebaserc`: `staging` (`bh-cycling-staging`) and `production` (`bh-cycling-production`). Select one before deploying or working with the emulator:

```bash
npx firebase use staging       # or: npx firebase use production
npx firebase deploy --only functions
npx firebase deploy --only firestore:rules
```

`firebase.json` (repo root) points at `functions/` as the functions source and `firestore.rules` (repo root) as the Firestore rules file. The rules file defaults to deny-all; update it per-feature as Firestore-backed features are added.

### Intervals.icu OAuth secrets

`exchangeIntervalsToken` reads `INTERVALS_CLIENT_ID` and `INTERVALS_CLIENT_SECRET` from Firebase Secret Manager — set independently per project so each environment only ever talks to its own Intervals.icu OAuth app registration:

```bash
npx firebase use staging
npx firebase functions:secrets:set INTERVALS_CLIENT_ID
npx firebase functions:secrets:set INTERVALS_CLIENT_SECRET
# repeat with: npx firebase use production
```

The app side needs the matching public client ID to build the authorization request: set `EXPO_PUBLIC_INTERVALS_CLIENT_ID` in `.env.local` for local development, and as an EAS environment variable for the `development`, `preview`, and `production` environments (`eas env:create --name EXPO_PUBLIC_INTERVALS_CLIENT_ID --environment <env>` — this hasn't been run yet and needs an authenticated `eas login`).

## Releasing

Before cutting `rc/X.Y.Z`, build the e2e app and run the e2e suite on both platforms: `npm run e2e:build:ios`, `npm run e2e:ios`, `npm run e2e:build:android` and `npm run e2e:android`. CI doesn't run it. See `docs/e2e.md`.

`.github/workflows/release.yml` runs the checks, then `scripts/release.sh` for iOS and Android. It runs on every push to `main` too, so CI doesn't run separately there. The ref decides what ships.

| Ref                                      | Result                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to `main`                           | OTA update to the Dev build if one matches its native fingerprint, otherwise a new Dev build. Skipped with a warning when only 3 builds are left this month |
| Push to `rc/X.Y.Z`                       | Staging build of `X.Y.Z` if no build matches its native fingerprint, otherwise an OTA update to staging                                                     |
| Tag `vX.Y.Z` on `rc/X.Y.Z`               | Production build, submitted to App Store Connect and as a Google Play draft. Release it by hand in each store                                               |
| Push to `hotfix/vX.Y.Z`                  | OTA update to the matching staging build. Fails if native code changed                                                                                      |
| Tag `vX.Y.Z-hotfix-N` on `hotfix/vX.Y.Z` | Production OTA update published at 0%. Raise it to 100% on expo.dev to accept it                                                                            |

Android builds are not submitted yet: Google Play needs a service account key first. Install them from their EAS build page. The production submit profile also needs its own `ascAppId` before the first `vX.Y.Z` tag.

The release script pulls the Firebase files from EAS, so their variables must have `Sensitive` visibility. `Secret` values cannot be read outside EAS servers.

`hotfix/vX.Y.Z` branches start from the `vX.Y.Z` tag. Merge `rc/` and `hotfix/` branches back to `main` by PR after tagging. Only one rollout can be active, so accept or revert a hotfix before tagging the next one.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
