# End-to-end tests

The e2e suite uses the app the way an athlete does. It drives the staging Release build on a dedicated iOS simulator and a dedicated Android emulator with [tester-army/e2e](https://github.com/tester-army/e2e), against real staging Firebase and a dedicated Intervals.icu test athlete. ADR 0011 says why it's built this way.

It covers six flows:

1. Sign in, see "Dziś i jutro" on Home, and open today's Workout in Workout Details.
2. Move the Calendar to next month with "Następny" and back with "Dziś".
3. Sign out from Ustawienia, and stay signed out after a relaunch.
4. Open tomorrow's A Race from Home's next-race card, close it, and open it again from "Dziś i jutro".
5. Open tomorrow's day sheet in the Calendar, and tap its A Race to swap the day sheet for the Race Detail Sheet.
6. Open today's ride from "Dziś i jutro" in Activity Details, see its profile card in watts with its time-in-zone rows, scrub the card for the readout, and hide it with "✕ Ukryj".

Run it on both platforms before cutting `rc/X.Y.Z`. Nothing runs it automatically. You can also run it from your machine on Expo Simulators. See [Run on Expo Simulators](#run-on-expo-simulators).

## One-time setup

### Tools

- Node 24.8 or newer, and `npm ci` in the repo. In a worktree, also run `npm run worktree:link` to link `.env.local` and `firebase/` from the main checkout.
- Xcode with the iOS 27 simulator runtime.
- Android Studio with the Android SDK, and `ANDROID_HOME` exported in your shell (`export ANDROID_HOME=$HOME/Library/Android/sdk`).
- Claude Code, signed in with `claude`. Agent steps run on it through `@e2e-dev/acp`, so the suite needs no API key. A run with only locator steps never calls it.

`npx e2e doctor` checks the setup and says what's missing.

### The dedicated devices

The suite runs on its own simulator and emulator, never on the ones you develop on. The dev client has the same bundle id as the staging build, so sharing a device would swap one app for the other.

Create the simulator:

```sh
xcrun simctl create "BH e2e iPhone" "iPhone 17 Pro" com.apple.CoreSimulator.SimRuntime.iOS-27-0
```

Then turn off password AutoFill on it: boot it, open Settings → General → AutoFill & Passwords, and switch off AutoFill Passwords and Passkeys. Otherwise iOS may offer to save the password after sign-in in a sheet over the app. The sheet can arrive after Home shows and cover the next screen a test reads. Closing it can also leave the e2e engine without screen coordinates for the next tap (`ENGINE_FAILURE: … has no established screen-coordinate origin`).

Create the emulator. It needs the Android 37.2 Google Play system image, which `sdkmanager` installs:

```sh
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "system-images;android-37.2;google_apis_playstore_ps16k;arm64-v8a"
$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n BH_e2e_Pixel -k "system-images;android-37.2;google_apis_playstore_ps16k;arm64-v8a" -d pixel_10_pro
```

Other names work too. Set `E2E_IOS_DEVICE` or `E2E_ANDROID_DEVICE` to use them.

### Environment variables

`e2e.config.ts` loads `.env.local`, which is gitignored. Put the six required variables in it. The two device names are optional.

| Variable                       | Holds                                    | Read by                            | Default         |
| ------------------------------ | ---------------------------------------- | ---------------------------------- | --------------- |
| `E2E_USER_EMAIL`               | The test user's staging email            | The sign-in helper                 | None, required  |
| `E2E_USER_PASSWORD`            | The test user's staging password         | The sign-in helper                 | None, required  |
| `E2E_UNVERIFIED_USER_EMAIL`    | The unverified user's staging email      | The verify-email test              | None, required  |
| `E2E_UNVERIFIED_USER_PASSWORD` | The unverified user's staging password   | The verify-email test              | None, required  |
| `E2E_INTERVALS_API_KEY`        | The test athlete's Intervals.icu API key | The seed                           | None, required  |
| `E2E_INTERVALS_ATHLETE_ID`     | The test athlete's Intervals.icu id      | The seed                           | None, required  |
| `E2E_IOS_DEVICE`               | The simulator's name                     | The `ios` target and its build     | `BH e2e iPhone` |
| `E2E_ANDROID_DEVICE`           | The AVD's name                           | The `android` target and its build | `BH_e2e_Pixel`  |
| `E2E_IOS_BUILD_ID`             | An `e2e`-profile EAS build's id          | The `ios` target                   | None, local     |
| `E2E_ANDROID_BUILD_ID`         | An `e2e`-profile EAS build's id          | The `android` target               | None, local     |

The build script doesn't load `.env.local`. If you rename a device, also export its variable in your shell before you build.

With a build id set, that target runs on Expo Simulators instead of the local device: an `iPhone 17 Pro` or a `pixel_9` that installs the build. `E2E_*_DEVICE` doesn't apply there. Leave both build ids out of `.env.local`, so `npm run e2e:ios|android` stays local. `npm run e2e:cloud:ios|android` sets them.

When a required variable is missing, the seed stops before it calls Intervals.icu and names the missing variables. The cache leak check stops the same way when an email, password or the key is missing. A plain `npx e2e run` without either user's email or password stops before any test with `CONFIG_LOAD_FAILED`.

e2e reads `E2E_TELEMETRY_DISABLED` when the CLI starts, before it loads the config, so the config can't turn telemetry off. `npm run e2e:ios` and `npm run e2e:android` set it. Before you run `npx e2e` directly, run `npx e2e telemetry disable` once, which saves the choice on your Mac.

The test user is a verified staging email/password account, connected once from the staging app to the test athlete, which has no Strava link. Tests never go through the Intervals.icu OAuth flow. Connecting the athlete to the app again from anywhere replaces its token, so don't connect it from another account. If that happens, connect it again from the test user.

The unverified user is a second staging email/password account whose email is never verified, so it always lands on verify-email. Create it by signing up in the staging app, and never tap the link in the verification email. The verify-email test signs in as it, which sends it a verification email on every run. It needs no Intervals.icu connection.

## Build and install

```sh
npm run e2e:build:ios
npm run e2e:build:android
```

Each runs `scripts/e2e-build.sh`. It sets `APP_ENV=staging`, runs a clean `expo prebuild` for the platform, then builds the Release variant with the JS bundled in and installs it on the dedicated device. On Android, boot the emulator first (`$ANDROID_HOME/emulator/emulator -avd BH_e2e_Pixel`), because the install can fail while the emulator is still cold-booting.

The JS is bundled into the build, so the suite tests the code you last built. Rebuild after you pull or change app code. Test files and `e2e/support/` need no rebuild.

## Run

```sh
npm run e2e:ios
npm run e2e:android
```

Both scripts run the cache leak check (`npm run e2e:check-cache`), the seed (`npm run e2e:seed`) and then the suite. A plain `npx e2e run` skips the seed, so run `npm run e2e:seed` first when you run one file, or the tests whose title matches a pattern:

```sh
npm run e2e:seed
npx e2e run --target ios e2e/tests/sign-in.e2e.ts
npx e2e run --target android --grep "sign in"
```

`--debug` adds phase timings and a table of agent steps with their model calls.

The seed brings the test athlete to a known state. It deletes every event and every Activity whose `external_id` starts with `e2e-` from the start of last month to the end of the month after next. Then it creates the Workouts "E2E Sweet Spot" for today and "E2E Endurance" on the 15th of next month, the A Race "E2E Goal Race", a run, for tomorrow, and the Note "E2E Briefing", with one line of text, for today. Last, it uploads "E2E Ride", an 18-minute TCX ride with power from noon today, as an unpaired Activity with the `external_id` `e2e-ride`, so Activity Details has an Activity Profile to draw. Nothing else on the athlete is touched. If the seed fails, the script stops before any test runs, naming the failed call. The seed is a separate step in the npm scripts because e2e 0.23 has no global setup and its `test.setup` isn't available on mobile.

Every test starts signed out. The fixture clears the app's state, and on iOS the keychain, where the Firebase session lives. Then it opens the app on the sign-in screen.

The output goes to `.e2e/`, which is gitignored except for the replay cache: the run's `report.json` and a `trace.md` page for each failed test in its folder under `.e2e/results/`. Traces contain the test email, so mask it before you paste one anywhere.

The replay cache, `.e2e/cache/`, is committed so another machine can replay recorded agent steps instead of recording them again. The cache leak check fails, naming only the files, when a cache file holds the test email, password or Intervals.icu key. Delete those files and record the step again without typing the value as plain text.

## Run on Expo Simulators

Expo Simulators are the cloud iOS simulators and Android emulators that Expo hosts. Nothing runs the suite there automatically. You start a run from your machine, and only the device is in the cloud.

```sh
npm run e2e:cloud:ios
npm run e2e:cloud:android
```

Each script runs the cache leak check, then builds the `e2e` profile on EAS: a staging simulator app for iOS or a staging APK for Android. The first iOS build took 14 minutes and the first Android one 26. The script waits for the build and prints its id as `E2E_IOS_BUILD_ID=<id>` or `E2E_ANDROID_BUILD_ID=<id>`. Then it runs `npm run e2e:ios` or `npm run e2e:android` with that id set. The seed and the suite run on your machine, and `@e2e-dev/eas` leases a device that installs the build.

Every build uses EAS build credit. When only the tests changed, reuse a build by setting its id, and the script skips the build:

```sh
E2E_IOS_BUILD_ID=<id> npm run e2e:cloud:ios
```

The JS is bundled into the build, so reuse one only when the app code hasn't changed since it was built.

`@e2e-dev/eas` leases the device with your `eas login` session, or with `EXPO_TOKEN` when it's set. The seed and the suite read `.env.local` as in a local run, agent steps run on your own `claude` login, and the output lands in `.e2e/`. Run one at a time, because every run reseeds the same test athlete.

### How the cloud devices differ

- iOS runs 26.x on an `iPhone 17 Pro`, and the version can't be chosen. Local runs use iOS 27.
- The cloud iPhone's system language is English, so system sheets are in English. The sign-in helper taps "Not Now" there instead of "Nie teraz". The app itself stays in Polish.
- Password AutoFill can't be turned off on a cloud iPhone, so the save-password sheet can still show and make a test flaky.
- Android runs the Android 35 Google APIs x86_64 image on a `pixel_9`, which Expo marks as still in development. Local runs use Android 37.2 on arm64.
- Every command goes over the network, so steps are slower. A device takes about 2 to 3 minutes to start. Then the suite takes about 3 minutes on iOS and 2 on Android.
- The seed and the suite take "today" from your machine. The app takes it from the cloud device, whose timezone nothing can read. If the two differ, a run near midnight in either timezone may fail.

## Write a test

- Put it in `e2e/tests/` as `<flow>.e2e.ts`. Jest ignores `*.e2e.ts` files, and e2e runs only `e2e/tests/**/*.e2e.ts`.
- Import `test` from `../support/fixtures`, not from `@e2e-dev/mobile`, so the test starts signed out. Sign in with `signIn(screen)` from `../support/signIn`.
- Follow the locator rules in `CODING_STANDARDS.md`. Match visible text with a regex, reach fields by placeholder, and add a `testID` only when text is ambiguous or missing.
- Reach what iOS's accessibility tree merges or hides through the helpers in `e2e/support/locators.ts`. "iOS accessibility facts" in `docs/agents/e2e-tests.md` lists each fact and its helper.
- Assert only on the seeded Workouts, Race, Note and ride, by name.
- Confirm a React Native `Alert` by locator on its button text, with `/i`, because Android may report the button in capitals. Don't use `device.alert('accept')`, which matches only English labels on iOS. A locator reaches the alert on both platforms.
- On iOS, an accessible element hides the elements inside it. A `testID` inside a button, such as `calendar-today` inside a Calendar day, isn't in the tree, so reach the button instead.
- Scroll to a row below the fold with `screen.scrollUntilVisible(locator)` before you tap it.
- Let `test` infer its fixture types. Typing them as `any` stops `tsc` checking the `expect` calls.
- Don't name a support file `test.ts` or `*.test.ts`, because Jest runs any file with that name. Jest tests of e2e support code, such as the seed planner, go in a `__tests__/` folder beside it.

## Known issues

- **`ENGINE_FAILURE: device … is owned by session …`:** another agent-device session holds the device, most often T3's Device panel. Close the Device panel, or the other session, and run again.
- **iOS keyboard covers the sign-in button.** With the keyboard up, `/^Zaloguj się$/` matches only the screen title, and tapping it just closes the keyboard. The sign-in helper submits with the keyboard's Done key instead, then taps "Nie teraz" (or "Not Now" on Expo Simulators' English iOS) if iOS offers to save the password.
- **iOS reports a full-screen "Toolbar" over the Calendar header.** A locator tap on "Następny" or "Dziś" fails with "covered by the toolbar", though nothing covers it on screen. The Calendar test taps the middle of the button's bounding box with `screen.tapAt`.
- **Screenshots aren't redacted.** Never type the real password into a field that isn't secure, even to debug. A failure screenshot would show it.
- **"Nieprawidłowy e-mail lub hasło." at sign-in:** staging rejected `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`, or the unverified pair. Fix them in `.env.local` before you run again, because Firebase blocks an account for a while after many failed sign-ins.
- **Android infra flakes under load:** `adb timed out after 10000ms` while preparing the device, or `app.clearState` reporting that the app "remained foreground after close". Run again when the Mac is less busy.
- **iOS build fails with `lipo: write() failed, errno=28`:** the disk is full. An iOS Release build needs about 11 GB of DerivedData. Free space, then rerun only the build step, which reuses the DerivedData: `APP_ENV=staging LANG=en_US.UTF-8 npx expo run:ios --configuration Release --no-bundler --device "BH e2e iPhone"`.
- **iOS build fails with `MapLibre/MapLibre.h not found`:** the native project is stale. Build with `npm run e2e:build:ios`, which always prebuilds clean.
- **CocoaPods crashes inside its error reporter:** `LANG` isn't `en_US.UTF-8`. The build script sets it, so this only happens when you run `expo` by hand.
- **The Android build hangs on `OutOfMemoryError: Metaspace`:** Gradle didn't get its memory settings. `app.config.ts` sets `org.gradle.jvmargs` through the `withGradleMemory` plugin, so check that `android/gradle.properties` has `-Xmx4096m -XX:MaxMetaspaceSize=1536m` after prebuild.
- **The build ends with "Opening exp+black-horse-cycling-app://expo-development-client/…":** harmless. The Release build launches normally.
- **A run that crosses midnight may fail.** The seed and the tests take "today" from the Mac's clock, which the simulator and emulator share.
