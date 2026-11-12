# BH Cycling

Expo (SDK 54) app with [Expo Router](https://docs.expo.dev/router/introduction/), a [development client](https://docs.expo.dev/develop/development-builds/introduction/), and React Native Firebase. This is not a plain Expo Go project: native modules require a **Dev client** on a simulator or device.

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

`APP_ENV` (`staging`, `production` or `dev`) selects the bundle ID, name, icon and Firebase files. It defaults to **`staging`** if unset.

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

**2. Build and run the Dev client** (first run compiles native code; later runs are faster). Use a second terminal while Metro is running, or press `i` / `a` in the Expo CLI once a dev client is already installed.

- iOS Simulator: `npm run ios`
- Android emulator or device: `npm run android`

After the dev client is installed on the simulator or emulator, you usually only need `npm start` and launch the app; it connects to Metro.

Expo Go does **not** include this app’s native Firebase stack. Use the dev client from `expo run:ios` / `expo run:android` (or a Dev client build from EAS: `eas build --profile dev-client`).

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

CI and releases run on EAS Workflows, and nothing runs on GitHub Actions. Pull requests run `.eas/workflows/ci.yml`, with the `Lint`, `Type Check` and `Test` jobs. `.eas/workflows/release.yml` runs on pushes to `main`, `rc/*` and `hotfix/*` and on `v*` tags. It calls `ci.yml`, then runs `scripts/release.sh` for iOS and Android in the `Release iOS` and `Release Android` jobs, so CI on `main` runs inside the release. The ref decides what ships.

| Ref                                      | Result                                                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to `main`                           | OTA update to the Dev build if one matches its native fingerprint, otherwise a new Dev build. Skipped with a warning when only 3 builds are left this month |
| Push to `rc/X.Y.Z`                       | Staging build of `X.Y.Z` if no build matches its native fingerprint, otherwise an OTA update to staging. Fails unless `app.config.ts` says `X.Y.Z`          |
| Tag `vX.Y.Z` on `rc/X.Y.Z`               | Production build, submitted to App Store Connect and as a Google Play draft. Release it by hand in each store                                               |
| Push to `hotfix/vX.Y.Z`                  | OTA update to the matching staging build. Fails if native code changed                                                                                      |
| Tag `vX.Y.Z-hotfix-N` on `hotfix/vX.Y.Z` | Production OTA update published at 0%. Raise it to 100% on expo.dev to accept it                                                                            |

New staging builds go to TestFlight and to the Google Play internal testing track. Android submits use the Google Play service account key in EAS credentials, which is assigned to the staging package only. Before the first `vX.Y.Z` tag, assign it to the production package (`eas credentials -p android`, `production` profile) and give the production submit profile its own `ascAppId`.

The release script pulls the Firebase files from EAS, so their variables must have `Sensitive` visibility. `Secret` values cannot be read outside EAS servers.

`version` in `app.config.ts` on `main` is the next release. The Dev build carries it. Cut `rc/X.Y.Z` from `main` at that version, so staging gets the version Dev already had, then bump `main` to the next version. The bump changes the native fingerprint, so it starts a new Dev build.

`hotfix/vX.Y.Z` branches start from the `vX.Y.Z` tag. Merge `rc/` and `hotfix/` branches back to `main` by PR after tagging. Only one rollout can be active, so accept or revert a hotfix before tagging the next one.

Runs and logs are on expo.dev, under the project's Workflows. The release jobs work like this:

- The workflow passes the ref to `release.sh` as `REF_TYPE` and `REF_NAME`.
- `eas` runs as the robot user, with its token in the secret EAS variable `EXPO_TOKEN`.
- Tags run in the `production` environment and branches in `development`, the same environment `release.sh` pulls. So `EXPO_TOKEN` must be assigned to both.
- The checkout is a single commit. For tags, `release.sh` fetches the `rc/` or `hotfix/` branch with its history before checking that the tag is on it.
- A running release is never canceled. A newer push to the same ref waits for it, and replaces an older push that is still waiting.
- Builds start with `--no-wait`, so a failed store build still leaves the run green. Check new builds on expo.dev.

### Cut-over from GitHub Actions

These steps are for the owner after the cut-over PR merges (Spec #361). Delete this section once they're done.

1. Delete the GitHub repo secrets nothing uses anymore: `gh secret delete EXPO_TOKEN` and `gh secret delete CLAUDE_CODE_OAUTH_TOKEN`.
2. The merge itself is a push to `main`, so it runs the first EAS release: CI, then a Dev OTA update or Dev build. Check it on expo.dev.
3. Before the first `vX.Y.Z` tag, assign `EXPO_TOKEN` to the `production` environment too.
4. The next `rc/*` push runs the EAS release. Check that it produces staging builds or an OTA update, as before, and link the run in #367.

To roll back, revert the cut-over PR.

## Dev build

The **Dev build** is a standalone release-mode app that tracks `main`. It installs next to the staging app as "BH Cycling (Dev)" (`com.wojtas.blackhorsecyclingapp.dev`, a staging icon with a DEV ribbon), uses the staging backend, and shows the version from `app.config.ts` with `(dev)` in Settings, such as `0.0.2 (dev)`. Its EAS build profile, update channel and `APP_ENV` are all `dev`. It's installed through EAS internal distribution: an ad hoc build on iOS and an APK on Android.

The **Dev client** is the Metro-loading `expo-dev-client` build, built with `eas build --profile dev-client`. It keeps the staging bundle ID.

### One-time setup

Run these once, from the repo root, with `eas login` and `npx firebase login` done.

1. Create the Dev apps in the staging Firebase project and download their config files:

   ```bash
   npx firebase apps:create IOS "BH Cycling (Dev)" --bundle-id com.wojtas.blackhorsecyclingapp.dev --project bh-cycling-staging
   npx firebase apps:create ANDROID "BH Cycling (Dev)" --package-name com.wojtas.blackhorsecyclingapp.dev --project bh-cycling-staging
   npx firebase apps:sdkconfig IOS <ios-app-id> --project bh-cycling-staging --out firebase/GoogleService-Info.dev.plist
   npx firebase apps:sdkconfig ANDROID <android-app-id> --project bh-cycling-staging --out firebase/google-services.dev.json
   ```

   `apps:create` prints each app ID.

2. Store both files as `Sensitive` file variables in the EAS `development` environment, so the release script can pull them:

   ```bash
   eas env:create --environment development --name GOOGLE_SERVICE_INFO_DEV_PLIST --type file --visibility sensitive --value ./firebase/GoogleService-Info.dev.plist
   eas env:create --environment development --name GOOGLE_SERVICES_DEV_JSON --type file --visibility sensitive --value ./firebase/google-services.dev.json
   ```

3. Register your iPhone for ad hoc builds with `eas device:create`, and install the profile it gives you.

4. Run the first Dev build per platform interactively. If you've run a local Android build, run `rm -rf node_modules && npm ci` first: its `android/build` folders inside `node_modules` change the local fingerprint, and EAS fails the build with a runtime version mismatch. It creates the Apple App ID, the ad hoc provisioning profile and the Android keystore:

   ```bash
   eas build --profile dev --platform ios
   eas build --profile dev --platform android
   ```

5. Add the Dev keystore's SHA-1 to the Firebase Dev Android app, or Google Sign-In fails on Android. Read the SHA-1 from `eas credentials --platform android` (pick the `dev` profile), then:

   ```bash
   npx firebase apps:android:sha:create <android-app-id> <sha1> --project bh-cycling-staging
   npx firebase apps:sdkconfig ANDROID <android-app-id> --project bh-cycling-staging --out firebase/google-services.dev.json
   ```

   If the re-downloaded file differs from the one in EAS, update the variable and rebuild Android:

   ```bash
   eas env:update --variable-environment development --variable-name GOOGLE_SERVICES_DEV_JSON --value ./firebase/google-services.dev.json
   eas build --profile dev --platform android
   ```

6. Install each build from its EAS build page.

### New phone or lost install

CI starts a Dev build only when native code changes, so rebuild by hand:

- **New iPhone:** `eas device:create`, then `eas build --profile dev --platform ios`. To skip the build queue, re-sign the latest build with `eas build:resign --platform ios --source-profile dev --target-profile dev` instead.
- **Lost install:** reinstall from the latest build's EAS page, or run `eas build --profile dev --platform <ios|android>`.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
