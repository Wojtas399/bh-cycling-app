# End-to-end tests use tester-army/e2e on real staging

## Status

Accepted

## Context

Business logic has Jest tests, and `CODING_STANDARDS.md` banned UI tests. So a broken build, a broken sign-in, a Home screen that doesn't load Workouts or a broken navigation only showed up when the dev clicked through the staging app by hand before cutting an `rc/X.Y.Z`. On two platforms that check is slow, easy to skip and never the same twice (Spec #286).

The app uses React Native Firebase and other native modules, so Expo Go can't run it, and a test has to drive a real native build. The app reads Intervals.icu through an OAuth token, and the repo has one dev, who avoids paid cloud billing where a free option is good enough.

## Decision

- **Framework:** [tester-army/e2e](https://github.com/tester-army/e2e), with `e2e`, `@e2e-dev/mobile` (which drives devices through agent-device), `@e2e-dev/acp` and `@agentclientprotocol/claude-agent-acp`. `@e2e-dev/acp` doesn't depend on the last one: `claudeCode()` starts Claude Code through that adapter, found installed in the project and never fetched at run time, so its README has the project install it. Versions are pinned exactly, because the framework is pre-1.0 and its API may change between minor releases. It was verified on e2e 0.23.0, @e2e-dev/mobile 0.12.6, @e2e-dev/acp 0.1.1 and @agentclientprotocol/claude-agent-acp 0.101.0. Tests are TypeScript files matching `e2e/tests/**/*.e2e.ts`, configured in `e2e.config.ts`.
- **What runs:** the staging Release build with its JS bundled in, built from a clean prebuild, on a dedicated simulator ("BH e2e iPhone") and a dedicated emulator (`BH_e2e_Pixel`). The dev client has the same bundle id, so the e2e devices are kept apart from the everyday ones (#271, #275).
- **Real staging, not emulators or stubs:** the suite signs in to staging Firebase as a dedicated test user, connected once to a dedicated Intervals.icu test athlete with no Strava link. The app reads through the athlete's stored OAuth token, so tests never go through OAuth. Before every run, a seed deletes the athlete's events whose `external_id` starts with `e2e-` and recreates a known Workout for today and one for the 15th of next month. It touches nothing else (#272, #273).
- **Locators first:** steps and asserts are locators: `getByText` with a regex, `getByPlaceholder`, and `getByTestId` for existing ids. `agent.act` is a fallback where no locator can reach an element. The first suite is expected to need none, since even the native sign-out alert should be confirmed by locator. That isn't yet confirmed on a device. Committed tests have no `agent.assert`. `agent.act` replays from the cache with no model call until the screen changes, but `agent.assert` calls the model on every run (#273, #275).
- **ACP on the dev's subscription:** agent steps run on Claude Code (`claudeCode({ model: 'sonnet' })`) through `@e2e-dev/acp`, on the dev's own `claude` login. The suite needs no billed API key (#275).
- **Local only:** the dev runs the suite by hand on both platforms before cutting `rc/X.Y.Z`. No CI job runs it, and it gates no PR or build.
- **iOS password workaround:** agent-device can't `fill` an iOS secure text field ([tester-army/e2e#1631](https://github.com/tester-army/e2e/issues/1631), a follow-up to #872). The shared sign-in helper taps the password field, then types the password with `pressSequentially` as a plain string from env, on both platforms. Because it isn't passed as a password credential, it must never go into an agent step. Once #1631 is fixed, the helper switches to `fill` with the password credential.

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
- Running in CI, gating `rc/` builds or PRs on a green suite, and a flake policy are open. Emulators, stubs and a committed replay cache with `--strict-cache` are worth revisiting for CI.
