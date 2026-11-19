# e2e on Expo Simulators: the @e2e-dev/eas setup

Research for #348 (map #346). Researched 2026-11-11. Sources are the `@e2e-dev/eas` 0.3.3 package source from npm, the tester-army/e2e docs source on GitHub, Expo's docs, `eas simulator:start --help` from eas-cli 27.7.2, and expo/examples `with-e2e` as of its last check (2026-10-29, Expo SDK 58). No simulator session was started for this research, because sessions are billed. Items marked **_unverified_** need a live session or a question to Expo.

## Short answer

- Add `@e2e-dev/eas` (latest `0.3.3`, pin it exactly) and set each target's `device` to `expoSimulators({ buildId, device })` when a build id is in the env. Keep the local device name otherwise, so `npm run e2e:ios|android` stays local. The package was built and tested against exactly our pins: its devDependencies are `e2e` 0.23.0 and `@e2e-dev/mobile` 0.12.6. Its peer ranges are `e2e >=0.15.0 <1` and `@e2e-dev/mobile >=0.8.0 <1`. Its Node engine is `^22.22.3 || >=24.8.0`.
- Add an `e2e` build profile: `withoutCredentials: true`, `ios.simulator: true`, `android.buildType: "apk"`, plus our staging `environment` and `APP_ENV`.
- In an EAS workflow, a `build` job makes the build. The test job runs on plain `linux-medium`, with `E2E_IOS_BUILD_ID: ${{ needs.build_ios.outputs.build_id }}` in its `env`. Never read `EAS_BUILD_ID`, which EAS sets to the running job's own id.
- Upload `.e2e` with `eas/upload_artifact` under `if: ${{ always() }}` to keep reports, traces, screenshots and video.
- Open risks: the cloud sim's timezone versus the runner's (our seed and tests compute "today" on the runner), the x86_64 Android image, and #1631, which is still open, so the `pressSequentially` workaround stays.

## The `@e2e-dev/eas` package

Facts below come from the published `dist/` of `@e2e-dev/eas@0.3.3` (`provider.js`, `client.js`, `project.js`, `provider.d.ts`) and its README, unless noted.

- **Versions.** `latest` is 0.3.3, published 2026-11-05. Nightlies `0.3.4-nightly-*` follow. First release 0.1.0 on 2026-09-30, so it's six weeks old (`npm view @e2e-dev/eas`).
- **Export.** `expoSimulators(options)` returns a `DeviceProvider` for `mobile({ device })`. `easSimulators` is a deprecated alias, still used by the `with-e2e` example.
- **No SDK.** It calls Expo's GraphQL API (`https://api.expo.dev/graphql`) with `fetch`. It creates sessions with `type: 'AGENT_DEVICE'`, the same API `eas simulator:*` uses.
- **Our engine supports it.** `@e2e-dev/mobile` 0.12.6 has the provider seam (`LeasedDevices` in `dist/provider.js`) and passes `projectRoot`, which `expoSimulators()` needs to read the project id. Older mobile versions fail with a message asking for an upgrade or an explicit `projectId`.

### Options (`ExpoSimulatorsOptions`)

| Option                  | Default                                                           | Notes                                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`             | `extra.eas.projectId` from the app config                         | For a dynamic `app.config.ts`, the provider runs the project's own `expo config --json --type public` with `EXPO_NO_DOTENV=1` and the run's env. Ours hard-codes `EAS_PROJECT_ID` and defaults `APP_ENV` to `staging`, so this works with no extra env. |
| `buildId`               | none                                                              | An Expo build that Expo installs and launches before the session is ready: a simulator build (`ios.simulator: true`) or an APK. Pair it with `app.bundleId` and leave `app.appPath` out, or `acquire` throws.                                           |
| `applicationArchiveUrl` | none                                                              | Mutually exclusive with `buildId` (`INVALID_CONFIG`).                                                                                                                                                                                                   |
| `device`                | Expo picks (iPhone 17, `medium_phone`)                            | An iOS device name or UDID, or an Android AVD hardware profile such as `pixel_9`. Sent as `{ ios \| android: { deviceIdentifier } }`.                                                                                                                   |
| `maxIdleTimeMinutes`    | 10, or `maxDurationMinutes - 1` when that is lower                | Must be a non-negative integer below `maxDurationMinutes`. 0 omits the idle limit. It's the backstop for a run that died.                                                                                                                               |
| `maxDurationMinutes`    | the account's cap                                                 | The docs say 40, or 115 on a high-priority plan. The eas-simulator skill says 40 on Free and 115 on paid plans. Sent as `maxRunTimeMinutes`.                                                                                                            |
| `agentDeviceVersion`    | the agent-device that `@e2e-dev/mobile` pins (0.21.36 for 0.12.6) | The version of the remote daemon. Keep the default, so the daemon matches the engine's client.                                                                                                                                                          |
| `tags`                  | `[]`                                                              | Added to the run's own tags. Expo stores them lowercased.                                                                                                                                                                                               |

There's no option for an Android `--system-image`, though `eas simulator:start` has one. The provider always gets the runner's default image (see Android below).

### Auth

- `EXPO_TOKEN` from the run's env wins. Otherwise the provider uses the session that `eas login` stored, as eas-cli does. With neither, the lease fails before any test: "`EXPO_TOKEN` is not set and eas-cli is not logged in" (`provider.js`).
- Sessions always go to production `api.expo.dev` ([e2e docs: Expo Simulators](https://e2e.com/docs/integrations/eas)).
- In CI, use a robot token with access to the project, stored as a secret in the job's EAS environment. The `with-e2e` example puts it in `preview` and checks for it in a step before running.

### Leasing, lifetime and idle stop

- **One session per worker slot per target.** All slots of a target lease in parallel in the runner process before test timing starts (`LeasedDevices.bind`). Each session is named `e2e <target> <n> of <total>` and tagged `e2e`, `e2e-run:<runId>` and `e2e-target:<target>`, so `eas simulator:list --tag e2e-run:<id>` finds them.
- **Startup.** It polls every 5 s. Expo needs "about three minutes to queue, boot, and install a build" (source comment and docs). After 2 minutes in the queue it logs a notice once. A session still booting 15 minutes after leaving the queue fails. Up to 3 failed polls in a row are tolerated. A session that is still queued after another session of the same run has idled to its limit fails the lease, with the advice to lower `workers` or raise `maxIdleTimeMinutes`.
- **Failure cleanup.** If a session doesn't become ready, the provider stops it right away, since Expo bills from creation. If the stop fails, Expo stops it at its idle or duration limit. `release` stops every lease after the last worker exits, on every exit path. A queued job is cancelled through `cancelJobRun`.
- **The run must fit one session.** A run must finish within one session's `maxDurationMinutes`. For longer suites, add workers or CI jobs ([docs](https://e2e.com/docs/integrations/eas)).
- **Concurrency.** Sessions beyond the account's concurrency limit queue. Keep `workers` times the number of Expo targets within it. The actual limit on the `wojtas` account, and on Starter, is **_unverified_**. Expo's devices page says Expo Simulators "is a limited-access preview, not included in paid or free plans, and currently available only to select partners" ([Expo: devices](https://docs.expo.dev/preview/simulators/reference/devices/)). It's billed as Expo Services usage ([Expo: devices compared](https://docs.expo.dev/preview/simulators/how-it-works/devices-compared/)).
- **Our case.** `workers: 1` (also the CI default), one target per job, and iOS and Android in separate parallel jobs means 2 concurrent sessions per run.

## Android on Expo Simulators

- **Profiles:** `medium_phone` (default), `pixel_9`, `pixel_9_pro`, `pixel_9_pro_xl`, `pixel_9a`. Every profile renders 720x1600 at density 300. The profile selects the hardware definition, not the screen size ([Expo: devices](https://docs.expo.dev/preview/simulators/reference/devices/)).
- **Default image:** `system-images;android-35;google_apis;x86_64` (API 35, Google APIs, no Play Store). `expoSimulators()` can't change it.
- **APK requirements:**
  - An `.apk` only. An `.aab` won't install. It can be any distribution type ([Expo: install your app](https://docs.expo.dev/preview/simulators/how-to/install-your-app/)).
  - It must match the image's ABI, which is **x86_64**. Our local emulator is arm64 API 37.2, so this is a new combination. An EAS-built APK should include x86*64, because `app.config.ts` doesn't narrow `reactNativeArchitectures`, but that's \*\*\_unverified*\*\* for our native dependencies (MapLibre, RN Firebase).
  - Use a Release build. A debug build loads JS from Metro and opens on an error screen ([e2e docs: CI, Mobile jobs](https://e2e.com/docs/ci)).
- **Status:** "Android Emulator support is still in development, and some features that work on iOS may not work on Android yet." eas-cli prints a warning when an Android session starts.
- **Config:** `expoSimulators({ buildId: process.env.E2E_ANDROID_BUILD_ID, device: 'pixel_9' })`, as in `with-e2e`.

## The simulator build

- **Profile.** Both e2e's workflow page and `with-e2e` use:

  ```json
  "e2e": {
    "withoutCredentials": true,
    "ios": { "simulator": true },
    "android": { "buildType": "apk" }
  }
  ```

  Simulator builds are unsigned, so Expo Build asks for no credentials ([Expo: install your app](https://docs.expo.dev/preview/simulators/how-to/install-your-app/)).

- **What our profile needs on top** (inferred from our `eas.json`):
  - `"environment": "development"` and `"env": { "APP_ENV": "staging" }`, like `staging`, so the build gets the staging Firebase files through the `GOOGLE_SERVICE*_STAGING_*` file env vars that `app.config.ts` copies in.
  - No `channel`, or a dedicated one, so an e2e build never takes a staging OTA.
  - The bundle id stays `com.wojtas.blackhorsecyclingapp.staging`. The dev-client clash in ADR 0011 can't happen on a fresh cloud sim.
- **Android signing.** `withoutCredentials` on Android signs with a debug keystore (**_unverified_**). Google Sign-In would reject that SHA, but the suite signs in with email and password.
- **Build id handoff.** A `type: build` job exposes `outputs.build_id`. The test job `needs` it and reads `${{ needs.build_ios.outputs.build_id }}` into `env` as `E2E_IOS_BUILD_ID` (or `E2E_ANDROID_BUILD_ID`). Don't use `EAS_BUILD_ID`: inside a workflow job, EAS sets it to the current job run. That exact bug was in e2e's own example and was fixed in [tester-army/e2e#1656](https://github.com/tester-army/e2e/issues/1656). The npm 0.3.3 README still shows `process.env.EAS_BUILD_ID`.
- **Reuse.** Expo Simulators can also install by `--build-fingerprint`, the newest finished build with that hash, but `expoSimulators()` only takes `buildId` or `applicationArchiveUrl`. Fingerprint reuse would need a workflow `fingerprint` and `get-build` job that outputs a build id. The e2e docs point to the [agent-device Expo Workflows template](https://github.com/callstackincubator/eas-agent-device/blob/main/.eas/workflows/agent-qa-mobile.yml) for this. The map lists it as not yet specified.

## Where it runs: an EAS Workflows job (Linux) or a local Mac

- **EAS Workflows.** `with-e2e`'s test jobs run on `linux-medium`, with no Mac and no nested virtualization, because the device is remote. Steps: `eas/checkout`, `eas/install_node_modules`, an `EXPO_TOKEN` check, `npx e2e run --target <p> --reporter list,junit`, then `eas/upload_artifact` with `if: ${{ always() }}`. It also sets `defaults.tools.node: '24'`, `environment: preview` and `CI: '1'`. The full file is quoted below.
- **Self-hosted in a workflow.** e2e's own [Expo Workflows page](https://e2e.com/docs/ci/eas-workflows) shows the other approach: `eas/download_build`, then a local simulator on `macos-medium` or `eas/start_android_emulator` on `linux-medium-nested-virtualization`. That approach doesn't use Expo Simulators. The map picks Expo Simulators.
- **Local Mac.** The same config runs from a Mac. Set `E2E_IOS_BUILD_ID=<id>` and either log in with `eas login` or set `EXPO_TOKEN`. Without the variable, the target falls back to the local device.
- **CI defaults** ([e2e docs: CI](https://e2e.com/docs/ci)). With `CI` set: `retries` 1, `workers` 1, `cache` read-only when unset, `.only` rejected. Add `E2E_TELEMETRY_DISABLED: '1'` to the job `env`.
- **Replay cache.** It keys on `app.bundleId`, so recordings made locally replay on hosted devices ([e2e docs: mobile, Hosted devices](https://e2e.com/docs/mobile)). Our suite has no `agent.act` today, so CI makes no model calls unless that changes.
- **What this repo needs in the workflow** (inference):
  - Run `npm run e2e:seed` once per run, in its own job that both test jobs `need`. The map says "seeded once per run". Running the seed in two parallel jobs would race its delete-then-create.
  - Run `npx e2e run --target <p>` directly, not `npm run e2e:ios`, which seeds again.
  - Put `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_INTERVALS_API_KEY`, `E2E_INTERVALS_ATHLETE_ID` and `EXPO_TOKEN` in the job's EAS environment. `loadLocalEnv()` is a no-op when `.env.local` is missing.
  - Pick a Node version that satisfies `>=24.8.0`. Which 24.x `node: '24'` resolves to on EAS is **_unverified_**.

### Example `.eas/workflows/e2e.yml` (expo/examples `with-e2e`, verbatim)

```yaml
# Builds the app for both platforms, then runs the e2e suite on Expo Simulators.
#
# The test jobs run on Linux. @e2e-dev/eas leases a hosted iOS simulator or Android
# emulator, EAS installs the build on it, and the tests drive it over agent-device.
#
# One-time setup, in the EAS dashboard for the `preview` environment:
#   EXPO_TOKEN          a robot token with access to this project (secret). The
#                       EAS Simulators provider authenticates with it.
#   AI_GATEWAY_API_KEY  optional (secret). Without it the two agent tests skip.
#
# Run by hand:  npx eas-cli@latest workflow:run .eas/workflows/e2e.yml

name: e2e

on:
  pull_request:
    branches: ['*']
  push:
    branches: [main]
  workflow_dispatch: {}

defaults:
  tools:
    node: '24'

jobs:
  build_ios:
    name: Build iOS simulator app
    type: build
    params:
      platform: ios
      profile: e2e

  build_android:
    name: Build Android APK
    type: build
    params:
      platform: android
      profile: e2e

  e2e_ios:
    name: e2e on Expo Simulators (iOS)
    needs: [build_ios]
    runs_on: linux-medium
    environment: preview
    env:
      CI: '1'
      # Not EAS_BUILD_ID: EAS sets that one for this job itself.
      E2E_IOS_BUILD_ID: ${{ needs.build_ios.outputs.build_id }}
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - name: Check EAS credentials
        run: |
          if [ -z "$EXPO_TOKEN" ]; then
            echo "EXPO_TOKEN is not set. Add it as a secret to the EAS 'preview' environment."
            exit 1
          fi
      - name: Run e2e
        run: npx e2e run --target ios --reporter list,junit
      - uses: eas/upload_artifact
        if: ${{ always() }}
        with:
          type: other
          name: e2e-ios
          path: .e2e

  e2e_android:
    name: e2e on Expo Simulators (Android)
    needs: [build_android]
    runs_on: linux-medium
    environment: preview
    env:
      CI: '1'
      E2E_ANDROID_BUILD_ID: ${{ needs.build_android.outputs.build_id }}
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - name: Check EAS credentials
        run: |
          if [ -z "$EXPO_TOKEN" ]; then
            echo "EXPO_TOKEN is not set. Add it as a secret to the EAS 'preview' environment."
            exit 1
          fi
      - name: Run e2e
        run: npx e2e run --target android --reporter list,junit
      - uses: eas/upload_artifact
        if: ${{ always() }}
        with:
          type: other
          name: e2e-android
          path: .e2e
```

Its `e2e.config.ts` switches per target on the build id: `device: iosBuildId ? easSimulators({ buildId: iosBuildId, device: 'iPhone 17' }) : process.env.E2E_DEVICE`, with `videoTouches: iosBuildId ? false : undefined`, and `pixel_9` on Android. Its `eas.json` sets `cli.version >= 20.3.0`. Its `package.json` uses tilde ranges: `@e2e-dev/eas ~0.3.2`, `@e2e-dev/mobile ~0.12.4`, `e2e ~0.21.3`. That's older than our e2e 0.23.0, and the package's own devDeps confirm 0.23.0 works.

### Sketch of the change to our `e2e.config.ts`

```ts
import { expoSimulators } from '@e2e-dev/eas';

const iosBuildId = process.env.E2E_IOS_BUILD_ID;
const androidBuildId = process.env.E2E_ANDROID_BUILD_ID;

// ios target
engine: mobile({
  platform: 'ios',
  device: iosBuildId
    ? expoSimulators({ buildId: iosBuildId, device: 'iPhone 17 Pro' })
    : (process.env.E2E_IOS_DEVICE ?? 'BH e2e iPhone'),
  videoTouches: iosBuildId ? false : undefined,
}),
// android target: same, with E2E_ANDROID_BUILD_ID and device 'pixel_9'
```

The `app` stays `{ bundleId }` with no `appPath`, which the provider requires.

## Device clock and timezone

- No source states the clock, timezone, locale or region of Expo Simulators devices: not Expo's devices, install or devices-compared pages, not `eas simulator:start --help` (which has no timezone flag), not `expoSimulators()` (no option), and not the e2e docs. **_Unverified_**.
- **Why it matters here.** `planSeed(new Date())` and the Calendar test's month title take "today" from the **process running the seed and e2e**, which in CI is the Linux runner. The app takes "today" from the **remote sim**. Locally, the Mac and the simulator share one clock and timezone (ADR 0011). In CI, they are two machines, and the seed may even run in a different job.
- **To do before the spec settles it:**
  - Run one probe session. Read the sim's date and timezone, for example from the Home "Dziś i jutro" header or `agent-device` output, and the runner's `date`.
  - Set `TZ` explicitly on the seed and test jobs to match the sim. The likely value is UTC, which is **_unverified_**.
  - Near midnight UTC, a Polish-time run still falls on two dates. The ADR's "a run that crosses midnight may fail" now applies to the UTC midnight of whichever side is UTC.

## Recordings, screenshots and reports from a failed run

- **Where they land.** Everything goes under `.e2e/` ([e2e docs: debugging](https://e2e.com/docs/debugging)):
  - `.e2e/report.json` and `.e2e/summary.md`.
  - Per test, `.e2e/results/<test>-<hash>/trace.md`.
  - Per attempt, `attempt-N/screenshots/001-failure.png` and `attempt-N/screen-at-failure.txt`.
  - With `--reporter junit`, a JUnit file.
- **Video.** Use `--video` to record every attempt, or `--video=retain-on-failure` to keep only the failures. On Expo Simulators, video is saved to `video/video.mp4` in each attempt's artifact directory. Set `videoTouches: false`, because "with touches enabled, stopping a recording on an iOS simulator can take minutes and the file is lost" ([docs](https://e2e.com/docs/integrations/eas), README). The `using-e2e` guide on docs.expo.dev says its example's `videoTouches: false` means "no video is saved". That contradicts the e2e docs, which say video is saved with touches off. **_Unverified_** which is current. Test it on the probe run.
- **Keeping them.** The test job runs `eas/upload_artifact` with `type: other`, a per-platform `name` and `path: .e2e`, under `if: ${{ always() }}`, so artifacts upload when tests fail. Retention of workflow artifacts on expo.dev is **_unverified_**.
- **Expo's session page.** The page that is logged as `simulator session <id>, <url>` also has a live preview while the session runs. Whether Expo keeps its own recording after the session is **_unverified_**.
- **Privacy.** Traces contain the test email. Screenshots mask secure fields only, and videos mask nothing ([e2e docs](https://e2e.com/docs/debugging)). Anyone with access to the project's workflow artifacts can see them. Keep the "never type the password into a non-secure field" rule. Android `--log-source device-logcat` isn't reachable through `expoSimulators()` anyway.

## Known limitations

- **Preview status.** Limited access, "not included in paid or free plans, and currently available only to select partners" ([Expo: devices](https://docs.expo.dev/preview/simulators/reference/devices/)). Access on `wojtas` is confirmed (map #346). `simulator:*` commands are experimental and hidden, and need eas-cli 20.3.0 or later (eas-simulator skill). eas-cli 27.7.2 is current.
- **Startup time.** About 3 minutes per session before tests start, plus any queue. On iOS, an accessibility snapshot can take tens of seconds, and every command crosses the network ([Expo: devices compared](https://docs.expo.dev/preview/simulators/how-it-works/devices-compared/)). Expect slower steps than locally. `LOAD_TIMEOUT` and other timeouts may need headroom (**_unverified_**).
- **iOS version.** Standard sessions run on macOS Tahoe 26.5 with Xcode 26.6, so iOS 26.x, and you can't choose the iOS version. iPhone Duo uses an image with Xcode 27.1. Our local suite runs on iOS 27. Device names on offer: iPhone 17 (default), 17 Pro, 17 Pro Max, Air, 17e and Duo, plus iPads ([Expo: devices](https://docs.expo.dev/preview/simulators/reference/devices/)).
- **Secure text entry on iOS ([tester-army/e2e#1631](https://github.com/tester-army/e2e/issues/1631)).**
  - The issue is still **open**. The report reproduces it on iOS 26.3 too, so it applies to cloud sims.
  - The fix belongs in agent-device's iOS runner. It merged as [callstack/agent-device#4350](https://github.com/callstack/agent-device/pull/4350) on 2026-11-11, after the latest stable agent-device (0.21.36), so at best it's in the `0.21.37-nightly.20261111.161` nightly.
  - `@e2e-dev/mobile` 0.12.6 pins agent-device 0.21.36. Keep the tap-then-`pressSequentially` workaround in CI.
- **Keychain.** The fixture's `device.clearKeychain()` goes through agent-device (`settings.update({ setting: 'reset-keychain' })` in `@e2e-dev/mobile` `surface.js`), not local `simctl`, so it should work on a remote sim. **_Unverified_** live.
- **Android in development.** Some iOS features may not work, and the image is x86_64 API 35 without Play Store (above).
- **Billing.** Every session counts toward Expo Services usage from the moment it's created. A dead runner is bounded by `maxIdleTimeMinutes` (default 10).

## What this repo's setup needs to change

1. **Packages.** `npm i -D -E @e2e-dev/eas@0.3.3`. Keep e2e 0.23.0, @e2e-dev/mobile 0.12.6 and @e2e-dev/acp 0.1.1, which are compatible. Record the new pin in ADR 0011's verified-versions list.
2. **`e2e.config.ts`.** Use a per-target `expoSimulators({ buildId, device })` when `E2E_IOS_BUILD_ID` or `E2E_ANDROID_BUILD_ID` is set, with `videoTouches: false`. Keep the local device fallback.
3. **`eas.json`.** Add an `e2e` profile: `withoutCredentials`, `ios.simulator`, `android.buildType: "apk"`, `environment: "development"`, `APP_ENV: staging`, and no staging channel.
4. **`.eas/workflows/e2e.yml`.**
   - Build jobs per platform.
   - One seed job.
   - Test jobs on `linux-medium` with `CI`, `E2E_TELEMETRY_DISABLED` and the build id in `env`, and `environment:` set to the EAS environment that holds `EXPO_TOKEN` and the four `E2E_*` secrets.
   - `--reporter list,junit`, `--video=retain-on-failure`, and an `always()` artifact upload.
5. **Timezone.** Probe the sim's timezone and set `TZ` on the seed and test jobs to match.
6. **Docs.** Amend ADR 0011's "Local only" line and add a CI section to `docs/e2e.md`.

## Sources

- npm: `npm view @e2e-dev/eas`, and the `@e2e-dev/eas@0.3.3` tarball (`README.md`, `package.json`, `dist/provider.js`, `dist/client.js`, `dist/project.js`, `dist/provider.d.ts`). `@e2e-dev/mobile@0.12.6` tarball (`dist/provider.js`, `dist/surface.js`).
- e2e docs: [Expo Simulators](https://e2e.com/docs/integrations/eas), [Expo Workflows](https://e2e.com/docs/ci/eas-workflows) (source: `tester-army/e2e/docs/ci/eas-workflows.mdx`), [CI](https://e2e.com/docs/ci), [Debugging](https://e2e.com/docs/debugging), [Mobile: Hosted devices](https://e2e.com/docs/mobile), [example: Expo Simulators](https://e2e.com/examples/expo-simulators).
- Expo docs: [Using e2e](https://docs.expo.dev/guides/using-e2e/), [Simulators: devices](https://docs.expo.dev/preview/simulators/reference/devices/), [Simulators: install your app](https://docs.expo.dev/preview/simulators/how-to/install-your-app/), [Simulators: devices compared](https://docs.expo.dev/preview/simulators/how-it-works/devices-compared/), and `npx eas-cli@latest simulator:start --help` (eas-cli 27.7.2).
- [expo/examples `with-e2e`](https://github.com/expo/examples/tree/master/with-e2e): `e2e.config.ts`, `eas.json`, `.eas/workflows/e2e.yml`, `package.json`, `README.md`.
- Issues: [tester-army/e2e#1631](https://github.com/tester-army/e2e/issues/1631), [tester-army/e2e#1656](https://github.com/tester-army/e2e/issues/1656), [callstack/agent-device#4350](https://github.com/callstack/agent-device/pull/4350).
