# End-to-end tests use tester-army/e2e on real staging

## Status

Accepted

Amended 2026-11-11 (Spec #353, #357): the seed also owns the athlete's Activities whose `external_id` starts with `e2e-`. Before each run it deletes them and uploads a short TCX ride with power, `e2e-ride`, for today, unpaired. Nothing outside `e2e-` events and Activities is touched.

Amended 2026-11-12 (Spec #361, #366): "Local only" no longer holds, and that decision is now "Where it runs". The dev still runs the suite locally by hand. It also runs in CI on Expo Simulators, in the EAS workflow `.eas/workflows/e2e.yml`, on every push to a PR from `rc/*` to `main` and on demand. The workflow is informational and gates no PR or build. In CI the seed and the suite take "today" from the Linux runner, and the app takes it from the cloud device. Each test job logs the runner's timezone and date, and the first CI run showed UTC. Nothing can read the cloud device's timezone yet, so the midnight risk stays accepted. The replay cache, `.e2e/cache`, is now committed, and CI only reads it. A leak check, `npm run e2e:check-cache`, fails when a cache file holds the test email, password or Intervals.icu key. It runs before every local run and in CI. In CI, an agent step that misses the cache runs on Claude Code with `CLAUDE_CODE_OAUTH_TOKEN`, a token from the dev's own subscription, so CI needs no billed API key either.

Amended 2026-11-14: the EAS workflow `.eas/workflows/e2e.yml` is removed, and nothing runs the suite automatically. Its runs blocked nothing, while they used EAS build credit and Linux job minutes that no plan covers. The dev starts every run by hand from their own machine. `npm run e2e:ios|android` runs on the local devices, and `npm run e2e:cloud:ios|android` builds the `e2e` profile on EAS and runs on Expo Simulators. Either way the seed and the suite run locally, so they take "today" from the dev's machine and agent steps run on the dev's own `claude` login. The replay cache stays committed, with its leak check, so another machine can replay recorded steps.

Amended 2026-11-13: [tester-army/e2e#1631](https://github.com/tester-army/e2e/issues/1631) is fixed in agent-device 0.21.37, which @e2e-dev/mobile 0.12.7 pins. The suite moves to @e2e-dev/mobile 0.12.7, and the sign-in helper drops the iOS password workaround: it `fill`s the password field with the password credential, so the runner redacts it.

## Context

Business logic has Jest tests, and `CODING_STANDARDS.md` banned UI tests. So a broken build, a broken sign-in, a Home screen that doesn't load Workouts or a broken navigation only showed up when the dev clicked through the staging app by hand before cutting an `rc/X.Y.Z`. On two platforms that check is slow, easy to skip and never the same twice (Spec #286).

The app uses React Native Firebase and other native modules, so Expo Go can't run it, and a test has to drive a real native build. The app reads Intervals.icu through an OAuth token, and the repo has one dev, who avoids paid cloud billing where a free option is good enough.

## Decision

- **Framework:** [tester-army/e2e](https://github.com/tester-army/e2e), with `e2e`, `@e2e-dev/mobile` (which drives devices through agent-device), `@e2e-dev/acp` and `@agentclientprotocol/claude-agent-acp`. `@e2e-dev/acp` doesn't depend on the last one: `claudeCode()` starts Claude Code through that adapter, found installed in the project and never fetched at run time, so its README has the project install it. Versions are pinned exactly, because the framework is pre-1.0 and its API may change between minor releases. It was verified on e2e 0.23.0, @e2e-dev/mobile 0.12.6, @e2e-dev/acp 0.1.1 and @agentclientprotocol/claude-agent-acp 0.101.0. Tests are TypeScript files matching `e2e/tests/**/*.e2e.ts`, configured in `e2e.config.ts`.
- **What runs:** the staging Release build with its JS bundled in, built from a clean prebuild, on a dedicated simulator ("BH e2e iPhone") and a dedicated emulator (`BH_e2e_Pixel`). The dev client has the same bundle id, so the e2e devices are kept apart from the everyday ones (#271, #275).
- **Real staging, not emulators or stubs:** the suite signs in to staging Firebase as a dedicated test user, connected once to a dedicated Intervals.icu test athlete with no Strava link. The app reads through the athlete's stored OAuth token, so tests never go through OAuth. Before every run, a seed deletes the athlete's events whose `external_id` starts with `e2e-` and recreates a known Workout for today and one for the 15th of next month. It touches nothing else (#272, #273). See the amendment under Status for `e2e-` Activities.
- **Locators first:** steps and asserts are locators: `getByText` with a regex, `getByPlaceholder`, and `getByTestId` for existing ids. `agent.act` is a fallback where no locator can reach an element. The first suite needs none: even the native sign-out alert is confirmed by locator on both platforms. Committed tests have no `agent.assert`. `agent.act` replays from the cache with no model call until the screen changes, but `agent.assert` calls the model on every run (#273, #275).
- **ACP on the dev's subscription:** agent steps run on Claude Code (`claudeCode({ model: 'sonnet' })`) through `@e2e-dev/acp`, on the dev's own `claude` login. The suite needs no billed API key (#275).
- **Where it runs:** the dev runs the suite locally by hand on both platforms before cutting `rc/X.Y.Z`. They can also run it from their machine on Expo Simulators. Nothing runs it automatically, and it gates no PR or build. See the amendments under Status.
- **Password entry:** the shared sign-in helper `fill`s the password field with the password credential, on both platforms. Until agent-device fixed iOS secure text fields ([tester-army/e2e#1631](https://github.com/tester-army/e2e/issues/1631)), it typed the password from env with `pressSequentially`. See the amendment under Status.

### Considered and rejected

The framework was picked when the map was charted (#270), not in a bakeoff. The research (#271) and the spike (#275) then checked that it works on this app. None of the others has agent steps. An `agent.act` records its actions once and replays them without a model, so a step that no locator can express costs a model call only on its first run and after the screen changes.

- **Detox:** it runs its own framework inside the app under test, which needs a Detox build setup per platform. tester-army/e2e drives the same Release build a user gets, with nothing added to the app.
- **Maestro:** flows are YAML files run by Maestro's own CLI. They can't import the app's TypeScript (the Calendar flow builds the month title with the app's own month formatting), and `tsc` doesn't check them.
- **Appium:** it needs a WebDriver server and a driver per platform (XCUITest, UiAutomator2) installed and running beside the tests.
- **Firebase emulators or Intervals.icu stubs:** both work in principle. React Native Firebase has `useEmulator`, and a fake base URL would stub Intervals.icu. Both add test-only code to the app, and both hide real-API quirks and staging config problems (#272).

## Consequences

- `CODING_STANDARDS.md` now says user-facing flows get e2e tests. Jest render tests of components and screens stay banned, because the e2e suite is the UI test.
- Running the suite needs Xcode, the Android SDK, the two dedicated devices, the test user's and athlete's credentials in the gitignored `.env.local`, and a `claude` login. `docs/e2e.md` covers the setup.
- A run depends on staging being up and on the Mac's clock, which the simulator and emulator share. A run that crosses midnight may fail. Both are accepted.
- Another agent-device session that holds an e2e device, such as T3's Device panel, fails the run with a device-ownership error.
- Visible text is matched by regex, because merged labels carry icon glyphs on iOS. A `testID` is added only where visible text is ambiguous or missing, so the app doesn't fill up with test-only props.
- Upgrading e2e is a deliberate change, since a minor release may break the API.
- Running the suite automatically, gating `rc/` builds or PRs on a green suite, and a flake policy are open.
