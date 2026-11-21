# E2E tests

How agents run and write the end-to-end suite. `docs/e2e.md` is the full guide: device setup, env variables, build, run commands and known issues. ADR 0011 says why the suite is built this way.

## Run the suite

1. Rebuild if app code changed since the last build, because the JS is bundled into it: `npm run e2e:build:ios` or `npm run e2e:build:android`.
2. Run `npm run e2e:ios` or `npm run e2e:android`. Both run the build check, the cache leak check and the seed first. The build check fails when the installed build is older than the app code: rebuild, then run again. To run one file, run `npm run e2e:check-build -- <ios|android>` and `npm run e2e:seed`, then `npx e2e run --target <ios|android> e2e/tests/<file>.e2e.ts`.
3. To run on Expo Simulators instead, run `npm run e2e:cloud:ios` or `npm run e2e:cloud:android`. Each builds on EAS, which uses build credit, so ask first. Set `E2E_IOS_BUILD_ID` or `E2E_ANDROID_BUILD_ID` to reuse a build.
4. Read the results from `.e2e/report.json` and each failed test's `trace.md` under `.e2e/results/`.

## Rules

- **Never read or print `.env.local`.** The config loads it. A missing variable shows up as `CONFIG_LOAD_FAILED`, naming it. `docs/e2e.md` lists the variable names.
- **Mask the test email** before you quote a trace or the report: `sed -E 's/[^ "]+@[^ "]+/<email>/g'`.
- **Keep the e2e devices free.** One run at a time per device, and no other agent-device session on "BH e2e iPhone" or `BH_e2e_Pixel` during a run, including T3's Device panel. A held device fails the run with `ENGINE_FAILURE: device … is owned by session …`.
- **Never type the real password into a field that isn't secure,** and never put a secret in an agent step. Screenshots aren't redacted.
- **An agent step never types a credential or personal value as plain text.** The replay cache in `.e2e/cache` is committed, and a recording keeps what the step typed. Credentials go through `credentials`, or the step uses a locator `fill`. `npm run e2e:check-cache` runs before the seed and fails when a cache file holds the test email, password or Intervals.icu key. It names only the files: delete them and record the step again.
- **Leave the test athlete's data to the seed.** The seed owns only events and Activities whose `external_id` starts with `e2e-`. Don't create, edit or delete anything else on the test athlete or the test user.
- **Write tests by `CODING_STANDARDS.md`:** locators first, a `testID` only when visible text is ambiguous or missing, `agent.act` only as a fallback, no `agent.assert`.

## iOS accessibility facts

These are facts about iOS's accessibility tree and system UI. Each one has a helper in `e2e/support/locators.ts`, `e2e/support/calendar.ts` or the fixture. Use the helper, so a test needs no comment to explain its locator.

- **An accessible element hides what's inside it.** A button, such as a Note card, a Race tile, a week row or a Calendar day, is one node read by its composed label, and its visible text and any `testID` inside it, such as `calendar-today`, aren't in the tree. The Activity Profile card is one image, so its axis labels aren't nodes either. Reach these by label with `byComposedLabel`. A week row's label opens with its Workout Status, so build it with `weekRowLabel({ status, name })`.
- **The engine reports iOS's header trait as "other", not "heading".** Find a heading, such as a week view day rail, by its label, not by role.
- **A pushed screen keeps the screen below it in the tree.** Under Workout Details or Note Details, the Home tile or card is still there, and its label starts with the same name. Match a details title whole with `wholeText`.
- **A readout's rows sit beside its node, not inside it.** Find the Scrub Readout's reading on the screen, not inside the readout's `testID`.
- **iOS reports a full-screen "Toolbar" over the Calendar header.** A locator tap on "Następny", "Dziś" or the view toggle fails as covered, though nothing covers it. `tapThroughCalendarToolbar` taps the middle of the target's bounds instead.
- **A row scrolled into view can stop under the tab bar.** `tapClearOfTabBar` swipes it clear, then taps it.
- **The keyboard covers the "Zaloguj się" button.** A locator then finds only the screen title, and tapping it just closes the keyboard. `tapKeyboardDone` submits with the keyboard's Done key.
- **iOS may offer to save the password in a system sheet over the app,** in Polish on the local simulator and in English on Expo Simulators. `dismissSavePasswordSheet` taps "Nie teraz" or "Not Now" when it shows.
- **A React Native `Alert` is the platform's own dialog,** and its buttons are in the tree on both platforms. `device.alert('accept')` matches only English labels like "OK" on iOS, and Android may report a button in capitals. `tapAlertButton` taps the button by its text, in any case.
- **On iOS the Firebase session lives in the keychain,** which `app.clearState()` leaves behind. The `signedOut` fixture clears the keychain too.
