# Research: running tester-army/e2e on BH Cycling (Expo 57 dev-client)

Answers issue #271 (part of map #270). Throwaway research branch, never merged.

Sources were read on 2026-11-06 from `tester-army/e2e` at commit
`937ea15` (`e2e` 0.23.0, `@e2e-dev/mobile` 0.12.6, `@e2e-dev/acp` 0.1.1,
`@e2e-dev/eas` 0.3.3, bundled `agent-device` 0.21.36). The `docs/*.mdx`
files in the repo are the source of e2e.com/docs; one page,
[e2e.com/docs/mobile](https://e2e.com/docs/mobile), was compared against the
live site and matched. Citations use repo paths (`docs/…`, `packages/…`,
`examples/…`). Nothing was installed into the app.

Pre-1.0 warning: the API moves between minors. The Expo example was "last
checked on 2026-11-04 with Expo SDK 57, e2e 0.22.0, @e2e-dev/mobile 0.12.5"
(`examples/with-expo/README.md`). That matches our stack: Expo ~57.0.26 and RN 0.86.3.

---

## 1. Install, `npx e2e init`, config shape, and the Expo example

- **Requirements.** Node 24.8+, or 22.22.3+ on Node 22. For mobile, Xcode with an iOS
  simulator runtime and/or the Android SDK with an emulator
  (`docs/quickstart.mdx`).
- **`npx e2e init`.** An interactive wizard. Choose **Mobile (iOS/Android)**: it adds
  `@e2e-dev/mobile`, defaults to iOS on macOS, and writes an example that opens the
  Settings app. Then choose a model gateway. The gateway choices are `vercel`, `openrouter`,
  `openai-compatible`, `chatgpt`, `copilot`, `opencode-console`, `grok`, or `none`.
  **Claude Code/ACP is not a wizard option**, so pick `none` and add
  `@e2e-dev/acp` by hand. Flags: `--engine mobile`, `--gateway none`,
  `--skills .claude/skills`, `--mcp .mcp.json`, `--install`. It also installs an e2e
  agent skill and MCP config (`docs/reference/cli.mdx#e2e-init`).
  `npx e2e init --example with-expo` copies the example instead.
- **Check the setup** with `npx e2e doctor`. It checks agent-device, Xcode or the Android SDK,
  the named devices, and whether the `bundleId` is installed (`docs/mobile.mdx`).
- **Config shape** (`examples/with-expo/e2e.config.ts`):

  ```ts
  import { mobile } from '@e2e-dev/mobile';
  import type { E2EConfig } from 'e2e';

  const app = { bundleId: 'com.wojtas.blackhorsecyclingapp.staging' }; // ours: staging id
  export default {
    agents: {
      default: {
        /* model or executor */
      },
    },
    targets: [
      { name: 'ios', engine: mobile({ platform: 'ios' }), app },
      { name: 'android', engine: mobile({ platform: 'android' }), app },
    ],
    workers: 1,
  } satisfies E2EConfig;
  ```

  Other `app` keys: `appPath`, `launchArguments`, `permissions`, `identity`,
  `command`, `readyUrl` (`docs/reference/mobile.mdx#the-app-under-test`). Tests are
  `tests/**/*.e2e.ts`. `--target ios|android` picks one platform.

- **What the Expo example does.** It is one greeting screen. `tests/deterministic.e2e.ts` has three
  locator-only tests (`getByText`, `getByTestId`, `fill`, `tap`, `toHaveText`).
  `tests/agentic.e2e.ts` has two `agent.act` + `expect` + `agent.assert` tests that
  are skipped without a model key. Its scripts build **Release** builds:
  `expo run:ios --configuration Release --no-bundler` and
  `expo run:android --variant release --no-bundler`. Then `e2e run --target ios`
  opens whatever is installed under the bundle id. It uses the Vercel AI Gateway
  (`AI_GATEWAY_API_KEY`), not ACP (`examples/with-expo/package.json`, `README.md`).

## 2. Which build: Release build (recommended) or dev client + Metro

Both work. The docs push toward a **Release build** with the JS bundled in:

- **Release build, no Metro (the example and the CI docs).** Local commands:
  `npx expo run:ios --configuration Release --no-bundler` and
  `npx expo run:android --variant release --no-bundler`. These prebuild `ios/` and
  `android/`, which are gitignored in our repo. CI docs: "Make a Release build on both
  platforms. A React Native or Expo debug build loads its JavaScript from Metro, which
  these jobs don't start, so it opens on an error screen" (`docs/ci.mdx#mobile-jobs`).
  An EAS alternative is a profile with `"ios": { "simulator": true }` and
  `"android": { "buildType": "apk" }` (`docs/ci/eas-workflows.mdx`). `eas build --local`
  with that profile would give the same `.app` and `.apk`. That is an inference: the docs
  show only cloud `build` jobs.
- **Dev client + Metro (documented, iOS-first).** `docs/mobile.mdx#expo-development-builds`
  gives iOS launch arguments `--initialUrl http://localhost:8081`,
  `-EXDevMenuShowsAtLaunch NO`, `-EXDevMenuIsOnboardingFinished YES`,
  `-EXDevMenuShowFloatingActionButton NO`, plus
  `app.command: npx expo start --port 8081` and
  `readyUrl: http://localhost:8081/status`, so the runner starts Metro. Caveats:
  the warm-up leaves the app on the dev launcher, the first launch waits for bundling
  (give the first check a longer timeout), and **on Android expo-dev-launcher ignores
  `--initialUrl`**. There you must call `device.openLink('exp+<slug>://expo-development-client/?url=<encoded>')`.
  For us that is `exp+black-horse-cycling-app://…`.
- **How it installs and launches.** The engine installs **nothing** on its own. Either
  the app is already installed under `app.bundleId` (by `expo run:*`, `simctl install` or
  `adb install`), or you set `app.appPath` (`.app` or `.apk`) and call
  `device.installApp()` in a fixture. `app.open()` is a fresh launch of the pinned
  bundle id, and `app.restart()` is a relaunch (`docs/mobile.mdx#point-at-your-app`,
  `docs/reference/mobile.mdx#installapp`).
- **BH-specific gotcha.** The dev client and a staging Release build share the bundle id
  `com.wojtas.blackhorsecyclingapp.staging` (`app.config.ts`). Installing one replaces
  the other on that simulator, so keep a dedicated "e2e" simulator and emulator. A Release
  build also needs the staging Firebase files present at prebuild
  (`firebase/GoogleService-Info.staging.plist`, `google-services.staging.json`).

## 3. agent-device: finding and driving devices, and what the Mac needs

- `@e2e-dev/mobile` depends on and pins `agent-device` (callstack). "No separate
  installation is needed" (`docs/reference/mobile.mdx`, `packages/mobile/package.json`).
  On iOS it builds and starts an XCUITest runner, cached under
  `~/.agent-device/apple-runner/derived` (`docs/ci.mdx`). On Android it uses adb and
  UIAutomator.
- **On the Mac:** Node, Xcode plus an iOS simulator runtime, and the Android SDK plus an
  AVD. Export `ANDROID_HOME` so `aapt` is found, then run `npx agent-device daemon stop`
  after changing env (`docs/mobile.mdx#troubleshooting`).
- **Device selection.** `mobile({ platform, device })`. `device` can be a name
  (`'iPhone 17'`), a UDID, `emulator-5554`, a list (a pool, one worker each), or a
  `DeviceProvider`. If you omit it, the engine uses booted devices that no other agent-device
  session holds, and boots one if none is booted. A booted simulator you are using by hand
  still joins the pool, so **name the device** to keep runs off it
  (`docs/reference/mobile.mdx#device-option`). Devices boot in `prepare` before timing
  starts.
- **Wedges.** If the iOS runner gets busy or wedged, run `npx agent-device daemon stop`, then
  `xcrun simctl shutdown/boot <udid>`.
- **Platform limits.** `setNetwork('offline')` and airplane mode work on Android only. On iOS,
  React Native tab roles read as `other` (see §6).

## 4. `@e2e-dev/acp` on Claude Code

- **Setup** (`packages/acp/README.md`, `docs/subscriptions.mdx#use-your-coding-agent`):

  ```bash
  npm install -D @e2e-dev/acp @agentclientprotocol/claude-agent-acp
  ```

  ```ts
  import { claudeCode } from '@e2e-dev/acp';
  agents: { default: { executor: claudeCode({ model: 'sonnet' }) } }
  ```

  Sign in with `claude`, or set `ANTHROPIC_API_KEY`. Options: `model`, `env`, `system`,
  `name`.

- **Headless:** yes. The runner spawns the adapter as a Node subprocess
  (`process.execPath <adapter bin>`) and talks ACP over stdio. It has no TTY and no UI,
  and auth is the existing `claude` login (`packages/acp/src/presets.ts`). Claude Code
  starts locked down: `tools: []`, `settingSources: []`, `strictMcpConfig`, no saved session,
  no permission bypass. Any of its own tool use fails the step with `POLICY_DENIED`.
- **Mobile:** ACP is engine-agnostic. The agent gets "the built-in agent's action tools for
  the verbs the target's engine supports", and screenshots reach it as images
  (`packages/acp/src/tools.ts`). Every documented example is web, though, so
  **ACP on mobile is not shown working anywhere.** Prove it in the first spike.
- **Limits that matter for us** (`docs/subscriptions.mdx` › Limits):
  - With an `executor`, the agents entry takes **no `tools`**, so `mobileTools`
    (`open_app`, `swipe`, system `alert`) is unavailable. Pre-grant permissions with
    `app.permissions` so no system alert appears.
  - `agent.waitFor` and `agent.extract` need a `model` on the agents entry. ACP alone
    serves only `act` and `assert`.
  - Each prompt turn counts as one model call against `maxModelCalls`.
  - Secrets reach the agent by name only, through `type_secret`. Keep them in
    `E2E_SECRET_*` and `E2E_USER_*` variables, because other env vars do reach the agent.
- `npx e2e login` has no Claude subscription login. Claude Max/Team can only be used through
  the plan's monthly API credits (an API key) or through ACP (`docs/subscriptions.mdx`).

## 5. Replay cache: storage, committing, staleness

From `docs/cache.mdx` and `docs/reference/mobile.mdx#replay-cache-on-a-device`:

- **Storage.** One JSON file per `agent.act` step under `.e2e/cache/`, named by a key hash. A file holds
  actions, target descriptions, typed text, and end checks, but no prompts or screenshots. Secret fills
  store only the name.
- **Committed?** `e2e init` gitignores `.e2e/cache/`. To share it, remove the line and
  commit, then review entries like test data. The cache key holds the app and not the device,
  so local recordings replay in CI or on hosted devices. Mode is `read-write` locally and
  `read-only` when `CI` is set. `E2E_CACHE_DIR` shares one directory across checkouts.
- **Written** only after a later check verifies the step (a locator `expect`, `waitFor` or
  `agent.assert`). An unverified step is not saved.
- **`agent.assert`, `agent.waitFor` and `agent.extract` always run live.** Only `act` replays,
  so a cached run still calls the model once per `agent.assert`.
- **Goes stale / misses** when you rename the test, its describe or the target, move the file,
  change the instruction or an ordinary param, change the agent or its context, switch engine,
  change the project id or app identity, or upgrade e2e in a way that rekeys entries. A
  model change does not cause a miss. A replay hands off to the agent when a control is not found,
  is ambiguous, the end check mismatches, and so on. Wrap timestamps and emails in `unique()`.
- **`--strict-cache`** makes a stale replay fail with `REPLAY_STALE` and no model call. This is
  the CI mode for "no model in CI".
- **Device anchor.** Location is `<bundle id> / <screen title>`, where the title comes from the iOS
  navigation bar or the Android toolbar (`packages/mobile/src/nodes.ts: screenTitle`).
  **Our app sets `headerShown: false` on every Stack and on Tabs**, so the title is undefined
  and every screen anchors as just the bundle id. The "same starting screen" check
  then can't tell screens apart. The end-state check still guards replays. Start each test
  with `app.open()` and deterministic locator steps before an `act`.

## 6. Locators on React Native

From `docs/reference/mobile.mdx#capabilities` and `docs/mobile.mdx`:

- `getByText` works on RN `Text`: it is `StaticText` on iOS and `TextView` on Android, and
  queries return the innermost match. The Expo example uses `getByText('say hello')`
  with no testID.
- `getByRole` works where RN emits a native trait. `accessibilityRole="button"` gives
  `button`, `TextInput` gives `textbox`, `secureTextEntry` gives a secure textbox, and
  `accessibilityRole="header"` gives a heading. Switches report `checked`, and RN checkboxes and radios
  report it only with `accessibilityState.checked`. **A `Pressable` without
  `accessibilityRole` has no vocabulary role.** The tree keeps its raw type in lower case, so
  `getByRole('button')` misses it. Use `getByText` or `getByLabel`, or add the role.
- `getByLabel` matches `accessibilityLabel`, which is the Android content description.
- `getByTestId` needs `testID`, which becomes the iOS accessibility identifier and the Android resource id.
- Known RN gaps: on iOS an RN tab (`accessibilityRole="tab"`) has role `other`, so query
  our Tabs by label or test id. On iOS a plain `View` exposes no children, so scoping or
  `filter({ has })` on a View finds nothing. Scope to `role=scroll-area` or use test ids.
- **Verdict:** no testIDs are required, but text and roles only go as far as our
  accessibility props. Today 19 files use `testID` and about 48 places set an
  accessibility role or label. Expect to add roles and labels, or testIDs, where text is
  ambiguous (for example, repeated Workout tiles).

## 7. Sign-in, sessions, and resetting state

- **No saved sessions on devices.** `test.setup`/`session:` are web-only. "A simulator
  has no portable session snapshot; sign in per test or seed the app"
  (`docs/mobile.mdx#what-differs-from-the-web`, `state: Not declared`).
- **Between tests the app stays where the last test left it.** `app.open()` is a
  fresh launch but keeps data, so a Firebase session persists across tests unless reset.
  One option is to sign in once in the first test and rely on the persisted session. Order
  dependence is the risk.
- **Credentials:**

  ```ts
  credentials: { athlete: { username: 'e2e@…', password: process.env.E2E_PASSWORD ?? '' } }
  ```

  `credentials.user('athlete')` returns the username and a `Secret` password. Use it with
  `screen.getByLabel(...).fill(pw)` or `agent.act('Sign in', { params })`. The runner types it
  into a secure field, and screenshots mask it. Override per run with
  `E2E_USER_ATHLETE_PASSWORD` (`docs/authentication.mdx`). Passwords shorter than 6 characters
  fail config load.

- **Reset:**
  - `app.clearState()` clears the app's data through agent-device `clear-app-state`, then relaunches,
    and permissions are re-applied (`packages/mobile/src/surface.ts: reset`).
  - **iOS: Firebase Auth lives in the keychain, which `clearState` leaves alone.**
    `device.clearKeychain()` resets the whole simulator keychain. The docs name "a Firebase sign-in"
    explicitly. It is iOS-simulator only (`docs/reference/mobile.mdx#clearkeychain`).
  - Android: `clearState` wipes the app's data, Firebase included. `clearKeychain` is
    `UNSUPPORTED_CAPABILITY` there.
  - Full wipe: `device.installApp(path, { reinstall: true })`.
  - A signed-out start needs `clearState()`, plus `clearKeychain()` on iOS, in `beforeEach`
    or a fixture.
- Deep links: `device.openLink('blackhorsecyclingapp://…')` could jump straight to a route.

## 8. CI later (the fog)

- **Self-hosted CI shape** (`docs/ci.mdx#mobile-jobs`, `docs/ci/github-actions.mdx`): one job
  per platform. iOS runs on macOS with a Release simulator `.app` and no signing. Android runs on Linux
  with **KVM**, because Apple-Silicon Macs can't nest-virtualize, so the Android emulator won't start on
  hosted Macs. Boot the device in its own step, pin the iOS runtime, cache
  `~/.agent-device/apple-runner/derived`, and commit the replay cache.
- **Costs, GitHub Actions (private repo).** The included allowance is $12/month on Free and $18 on Pro,
  as a dollar amount. Linux 2-core is $0.006/min and macOS is $0.062/min, rounded up per job
  ([runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing),
  [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
  That is about 190 macOS minutes a month on Free. e2e's own repo notes that an Expo iOS native build is "about
  twenty minutes", so it caches builds per native fingerprint (`.github/workflows/mobile.yml`).
- **Expo Workflows** (`docs/ci/eas-workflows.mdx`). A `build` job runs with an `e2e` profile
  (`withoutCredentials`, iOS simulator, APK). Custom jobs on `macos-medium` and
  `linux-medium-nested-virtualization` run `e2e run`. Prices from
  [expo.dev/pricing](https://expo.dev/pricing): macOS medium $0.075/min, Linux medium nested
  virt $0.020/min. The Free plan includes 15 Android and 15 iOS builds.
- **Hosted devices, `@e2e-dev/eas`** (`docs/integrations/eas.mdx`).
  `mobile({ device: expoSimulators({ buildId }) })`. The runner machine then needs no
  Xcode or SDK. Auth is `EXPO_TOKEN` or the `eas login` session. Sessions take about 3 minutes to start and are capped at
  40 minutes. Expo Simulators is **limited access**; check with
  `npx eas-cli@latest simulator:availability`. Pricing is beta: $0.10/min for both the iOS simulator and the Android emulator,
  billed per second. Starter and above get 60 minutes/month until 2027. **Not available on the Free plan**
  ([expo.dev/pricing](https://expo.dev/pricing)). Also supported: Limrun, BrowserStack, TestMu.
- **Model without a subscription in CI.** The docs say "Use API keys in CI"
  (`docs/subscriptions.mdx#ci`). ACP with `ANTHROPIC_API_KEY` works but is billed. A keyless
  route: commit the replay cache, run `CI=1 e2e run --strict-cache`, and keep CI-run checks to
  locator `expect`s. Every `agent.assert`, `waitFor` and `extract` needs a live model on every
  run, and so does any cache miss. So to run CI with no model, the CI suite must avoid
  `agent.assert` (or skip agent tests when no key is set, as the example does).

## Open questions (not answered by sources)

- ACP plus the mobile engine is not demonstrated in docs or tests. Verify it in a spike.
- Behaviour of the expo-router JS Tabs bar in the device tree (role `other` on iOS is
  documented for RN tabs; Android likely `tab` through the role description). Verify it by observing.
- Whether a Claude Code OAuth token (for example from `claude setup-token`) works for
  `claude-agent-acp` in CI. The e2e docs mention only the `claude` login or `ANTHROPIC_API_KEY`.
