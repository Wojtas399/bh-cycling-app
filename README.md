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
| `npm run reset-project`                             | Moves starter `app` code to `app-example` and gives a blank `app` directory |

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
