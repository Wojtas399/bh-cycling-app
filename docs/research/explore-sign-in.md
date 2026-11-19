# Explore: reaching a signed-in, seeded app state

Research for #410 (map #408). Researched 2026-11-19. Sources:

- `expo/explore` on GitHub at `main` = `1de4213` (2026-11-12): `README.md` ("Sign-in and other app state", capture modes, local simulator), `docs/quickstart-ci.md` (config reference, setup steps, secrets), `docs/private-review.md`, `CI-FLOW.md` (§5 capture), `skills/explore-setup/SKILL.md`, and the source files `src/ci/local-review.ts`, `src/capture/agent/session-local.ts`, `src/config/exploration-inputs.ts`, `src/capture/eas-build.ts` and `src/source/navigation.ts`.
- This repo at `origin/main` `4498b2d`: `docs/agents/e2e-tests.md`, `docs/e2e.md`, `e2e/` (`seed.ts`, `support/seedPlan.ts`, `support/signIn.ts`, `support/fixtures.ts`, `e2e.config.ts`), the `app/` route tree, `lib/authState.ts`, `app.config.ts`, `eas.json` and `README.md`.

No Explore run, build or simulator was started for this research. Items marked **_unverified_** need `expo-explore doctor --json` or a real `capture`.

## Short answer

- **Explore always starts on a fresh install**, so every capture signs in again. Nothing carries a Firebase session in. ([README, "Sign-in and other app state"](https://github.com/expo/explore#sign-in-and-other-app-state))
- **Deterministic mode** signs in with fixed `setup` steps in `.expo-explore/config.yaml`: `fill` the email, `tap` the password field, `type` `{{secret:E2E_USER_PASSWORD}}`, then `tap` submit with `ready` on "Dziś i jutro". The signed-out screens have to be captured by `open` steps _before_ the sign-in steps, because every route not landed on by setup is opened by link afterwards, in the state setup left.
- **Agent mode** signs in from English instructions that use `{{secret:E2E_USER_EMAIL}}` and `{{secret:E2E_USER_PASSWORD}}`, and reaches detail screens by tapping the seeded items by name. A **by-hand** `capture` in agent mode runs on the dev's own Claude login when `ANTHROPIC_API_KEY` isn't set, so it needs no API key. CI agent mode needs a paid API key.
- **Secrets come from the shell environment** of `npx @expo/explore capture`. The names `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are allowed. They must be exported without anyone printing `.env.local`.
- **Deep links:** the scheme is `blackhorsecyclingapp`. `/home`, `/calendar`, `/settings`, `/fitness`, `/change-password` and `/delete-account` need no params. `/workout/[id]`, `/workout/[id]/map`, `/activity/[id]`, `/activity/[id]/map` and `/note/[id]` need an Intervals.icu id. The seed recreates its events and ride on every run, so those ids change every time and can't be committed as `parameters`.
- **`e2e:seed` can run before a capture**, by hand: `npm run e2e:seed && npx @expo/explore capture …`. Explore has no pre-capture hook of its own. Reseeding makes a cached base capture stale, so pass `--no-cache` after a reseed.
- **Biggest risks:** the `e2e` profile's EAS `development` environment holds Sensitive _file_ variables (the Firebase configs), which Explore says a capture profile can't have. Also the duplicate "Zaloguj się" label on the sign-in screen, and Settings showing the email, which Explore refuses to screenshot if the email is a secret.

## How a capture gets its app state

Facts from Explore's docs:

- "Each run starts on a fresh install." Explore must be told how to get past sign-in: `--hints` for `explore:binary`, and `setup` steps or agent instructions for `capture` and CI. ([README](https://github.com/expo/explore#sign-in-and-other-app-state))
- `setup` "runs from the start whenever a revision has screens to capture, for each compared revision and whatever the scope." So base and head each sign in on their own. ([quickstart-ci.md, "When the config needs setup steps"](https://github.com/expo/explore/blob/main/docs/quickstart-ci.md#when-the-config-needs-setup-steps))
- "A route that a setup step lands on is captured right there, in that state. Every other selected route is opened afterwards by its app link, in the state that setup left." Order the steps signed-out screens first, then sign-in, then the signed-in screens. (same section)
- The supported setup actions are `open`, `tap`, `fill`, `type`, `scroll` and `wait`. `tap` and `fill` take exactly one `label` or `identifier`. Any action can carry `ready` and `requiresRoute`. There's no "press Enter" and no "back". (same section)
- A secure field is filled with `tap` and then `type` `"{{secret:NAME}}"`. (same section)
- iOS's save-password sheet is declined by Explore itself ("Not Now"). "Do not script that tap in setup." (quickstart-ci.md, end of "Exclude a route that has no screen")
- Between routes, `capture.reset: root-link` (the default) opens the app's root link. It doesn't reinstall or clear data, so the Firebase session survives between routes within one revision. (quickstart-ci.md, config reference)
- `capture.launch: screenshot` "relaunch[es] the app per appearance". A relaunch keeps the Firebase session, which RNFirebase persists in the iOS keychain. (config reference; persistence is RNFirebase's documented behaviour, and our own e2e fixture has to clear the keychain to sign out, `e2e/support/fixtures.ts`)
- With `--simulator local`, Explore creates a new simulator for each commit and deletes it afterwards. Base and head never share a device, keychain or session. ([README, "Local simulator instead of Expo Simulators"](https://github.com/expo/explore#simulator)) On Expo Simulators, each side gets its own session too (`CI-FLOW.md` §5; `capture.maxSessions` in the config reference).

### Secrets

- `{{secret:NAME}}` must match `[A-Z][A-Z0-9_]{0,127}`. Names starting with `GITHUB_`, `RUNNER_`, `ACTIONS_`, `AGENT_DEVICE_`, `ARGENT_`, `OPENAI_` or `ANTHROPIC_`, and `EXPO_TOKEN`, are refused. A missing or multi-line value fails before a device starts (`EXPLORATION_SECRET_MISSING`/`_INVALID`). (`src/config/exploration-inputs.ts`) So our existing `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` names work as they are.
- Locally the values come from `process.env` of the `capture` process (`src/ci/local-review.ts`, `createExplorationInputs` default env). Explore strips variables named like credentials only from the _dependency install_ step (`appEnvironment` in `local-review.ts`), not from capture.
- The model sees only the reference, and Explore types the value. "The value is redacted everywhere, and a screen that shows it gets no screenshot." ([README](https://github.com/expo/explore#sign-in-and-other-app-state); CI-FLOW.md §5.2 step 7: "A screenshot is refused if a secret value shows up in the accessibility tree.")
- In CI the same names become repository secrets, forwarded only to the capture steps (quickstart-ci.md §3 table). That's out of scope while capture stays by-hand.

**For us:** a wrapper script can load `.env.local` into the capture process without printing it, for example `node --env-file=.env.local` around the CLI, or `set -a; . ./.env.local; set +a` inside a script. The agent never reads the file. That matches the rule in `docs/agents/e2e-tests.md`. **_unverified_:** whether `npx @expo/explore` runs cleanly under `node --env-file`. A shell `source` in a script is the safe fallback.

**Email: plain or secret?** Explore's README says to keep "non-sensitive values like a test email as plain text". Our e2e rules treat the test email as sensitive: it's masked in traces, and `e2e:check-cache` fails on it. Settings shows the signed-in user's email (`app/(app)/(tabs)/settings/index.tsx`, `value={user?.email}`). If the email is a `{{secret:…}}`, Explore refuses to screenshot Settings. If it's plain text in committed config, the email goes into the repo. **Owner call.** There's no middle way: putting the email in agent instructions commits it too.

## Deterministic mode for this app

### Sign-in screen facts

From `app/(auth)/sign-in/index.tsx`, `i18n/locales/pl.ts` and `e2e/support/signIn.ts`:

- The email field has placeholder `you@example.com`, and the password field shows `••••••••`. Neither has a `testID`.
- The title and the submit button both read "Zaloguj się". A `tap` with `label: Zaloguj się` is ambiguous.
- On iOS the keyboard covers the submit button. Our e2e helper submits with the keyboard's Enter key, which Explore setup can't press. Explore "attempts native keyboard dismissal when a keyboard covers a target", and the skill suggests tapping an inert heading first to close the keyboard (SKILL.md, step 5).
- Success shows "Dziś i jutro" on Home (`signIn.ts`'s default landing).

**What deterministic sign-in likely needs** (an app change, for the spec):

- `testID`s on the email field, the password field and the submit button. CODING*STANDARDS allows a `testID` when visible text is ambiguous, and it is here. \*\*\_unverified*:\*\* whether `FormField` forwards `testID` to its `TextInput`.
- Steps along these lines (shape only, ids to be added):

```yaml
setup:
  # Signed-out screens first: a setup step that lands on a route captures it there.
  - action: open
    url: blackhorsecyclingapp://sign-up
    ready: { label: <a sign-up heading> }
  - action: open
    url: blackhorsecyclingapp://forgot-password
    ready: { label: <a forgot-password heading> }
  - action: open
    url: blackhorsecyclingapp://sign-in
    ready: { identifier: sign-in-email }
  - action: fill
    identifier: sign-in-email
    text: '{{secret:E2E_USER_EMAIL}}'
  - action: tap
    identifier: sign-in-password
  - action: type
    text: '{{secret:E2E_USER_PASSWORD}}'
  - action: tap
    identifier: sign-in-submit
    ready: { label: Dziś i jutro }
```

### Routes and deep links

Scheme `blackhorsecyclingapp`, the same for all `APP_ENV`s (`app.config.ts`). The staging bundle id is `com.wojtas.blackhorsecyclingapp.staging`. Expo Router drops the `(app)`, `(tabs)` and `(auth)` groups and the trailing `index` from paths.

| Route                 | Link                            | Params                                | State it needs                    | Notes                                                                                                                                                                           |
| --------------------- | ------------------------------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (`app/index.tsx`) | `blackhorsecyclingapp://`       | none                                  | none                              | A blank box until auth is known, then the guards move on. Probably `exploration.exclude`, since it renders nothing of its own.                                                  |
| `/sign-in`            | `…://sign-in`                   | none                                  | signed out                        | Captured where setup lands on it.                                                                                                                                               |
| `/sign-up`            | `…://sign-up`                   | none                                  | signed out                        | Same.                                                                                                                                                                           |
| `/forgot-password`    | `…://forgot-password`           | none                                  | signed out                        | Same.                                                                                                                                                                           |
| `/verify-email`       | `…://verify-email`              | none                                  | **unverified** user               | Needs the second e2e account, and a sign-out before the athlete signs in. Setup has no conditional or sign-out step that's safe to rely on. Exclude it, or leave it uncaptured. |
| `/home`               | `…://home`                      | none                                  | verified                          | "Dziś i jutro" with the seeded items.                                                                                                                                           |
| `/calendar`           | `…://calendar`                  | none                                  | verified                          | Month or week view. Day sheets and the Race Detail Sheet are sheets, not routes, so Explore doesn't capture them as screens (README, "Known limitations": modals are planned).  |
| `/settings`           | `…://settings`                  | none                                  | verified                          | Shows the email (see above).                                                                                                                                                    |
| `/fitness`            | `…://fitness`                   | none                                  | verified                          | Opened from Home's FitnessCard.                                                                                                                                                 |
| `/change-password`    | `…://change-password`           | none                                  | verified, email account           | The form only. Opening it does nothing.                                                                                                                                         |
| `/delete-account`     | `…://delete-account`            | none                                  | verified                          | The form only. Explore never taps destructive buttons. Opening the link is harmless.                                                                                            |
| `/workout/[id]`       | `…://workout/<eventId>`         | `id`: Intervals.icu event id (number) | verified + seeded                 | Fetched by id (`useWorkoutDetails`), so a valid id alone is enough.                                                                                                             |
| `/workout/[id]/map`   | `…://workout/<eventId>/map`     | `id`                                  | verified + a Workout with a Route | No seeded Workout has GPS, so there's no map to show.                                                                                                                           |
| `/activity/[id]`      | `…://activity/<activityId>`     | `id`: Intervals.icu activity id       | verified + seeded ride            | "E2E Ride".                                                                                                                                                                     |
| `/activity/[id]/map`  | `…://activity/<activityId>/map` | `id`                                  | verified + an Activity with GPS   | The seeded TCX has power but no positions (`seedPlan.ts`), so there's no map.                                                                                                   |
| `/note/[id]`          | `…://note/<eventId>`            | `id`: event id                        | verified + seeded                 | "E2E Briefing".                                                                                                                                                                 |

**The id problem.** `e2e/seed.ts` deletes every `e2e-` event and Activity and creates them again, so Intervals.icu assigns new ids on every seed. The e2e suite reseeds on every run. Committed `parameters` for the five dynamic routes would go stale after the next e2e run or reseed. Explore's skill says "Never invent IDs" (SKILL.md step 2). Options:

1. **Reach detail screens by setup taps** from Home: `tap` "E2E Sweet Spot" with `ready` on Workout Details, `open` `…://home`, `tap` "E2E Briefing", and so on. A route a setup step lands on is captured there. **_unverified_:** whether doctor still fails a `needs-parameters` route that only taps reach ("Screens that setup reaches by taps are not tracked" in `openedBySetup`, SKILL.md step 1). Also whether a `label` matches a Home tile whose accessibility label only _starts_ with the name (`workout-details.e2e.ts` notes this), which may need `testID`s on tiles.
2. **Make the seed keep ids stable**: update the `e2e-` events in place instead of deleting and recreating them. The ride is harder, since its date must be today. Then commit the ids as `parameters`. This is a change to the seed, which today follows "delete and recreate".
3. **Agent mode** for detail screens: the agent taps them by name. No ids needed.
4. Leave the dynamic routes out of deterministic capture (`exploration.exclude`) and rely on e2e for them.

The two `map` routes have no seeded GPS data in either case. Exclude them, or capture their empty state.

**Guard detection.** Explore's static analyzer finds guards from `<Redirect>` and `router.replace` (`src/source/navigation.ts`). It treats a `Protected` wrapper as "still a possible registration". Our guards are `Stack.Protected` in `app/_layout.tsx` and `app/(auth)/_layout.tsx`, with no `Redirect`. **_unverified_:** doctor may not report `ROUTE_GUARD_UNPREPARED` for our signed-in routes. That's harmless if setup signs in first. A wrong order would show up as `CAPTURE_LANDING_UNVERIFIED`.

## Agent mode for this app

- Config: `mode: agent`, `agent.provider: anthropic`, `agent.model`, and `agent.instructions: .expo-explore/instructions.md` (English prose). (quickstart-ci.md, "Agent mode")
- **By hand, no API key:** `local-review.ts` sets `subscription` when the provider's key env var is unset and logs "model: your local claude login". `session-local.ts` then requires `claude auth status` to report a claude.ai login or a `claude setup-token` OAuth token (`AGENT_SUBSCRIPTION_LOGIN_REQUIRED` otherwise), with "no API fallback". This fits #408's "no model API keys" and our e2e agent steps, which already run on the dev's `claude` login.
- **In CI:** the README requires `ANTHROPIC_API_KEY` as a repository secret, billed per use, and lists "Hosted acceptance of agent mode with an API key is incomplete" under Known limitations.
- An existing `setup` replays first, and a failure is passed to the agent, which recovers (CI-FLOW.md §5.2 step 3). So the same sign-in steps can serve both modes.
- The instructions would say: sign in with `{{secret:E2E_USER_EMAIL}}`/`{{secret:E2E_USER_PASSWORD}}`. Reach Workout, Note and Activity Details by tapping "E2E Sweet Spot", "E2E Briefing" and "E2E Ride" on Home. Wait for "Dziś i jutro". Never sign out, delete the account or connect Intervals.icu. The app is Polish.

## Seeding before a capture

- Explore has no global-setup hook. Config `setup` holds device actions only. Data is "live": "Application data, time, and network remain live." ([private-review.md, "Capture source and evidence"](https://github.com/expo/explore/blob/main/docs/private-review.md))
- `npm run e2e:seed` is a plain Node script against the Intervals.icu API (`e2e/seed.ts`). It loads `.env.local` itself and touches no device, so it can run right before `npx @expo/explore capture`. A wrapper like `npm run explore:capture` could run the seed, then the capture, with `.env.local` loaded.
- **Cache staleness:** Explore caches captures in `~/.cache/expo-explore` for 30 days, and "the same base is not captured twice" (README, "Other commits"). After a reseed, or on another day, a cached base shows other dates, ids and data. A screen whose source changed and whose captures differ is reported **Modified**, even when the difference is data (quickstart-ci.md "Stable captures"; CI-FLOW.md §6 verdicts). Pass `--no-cache` whenever the seed ran since the base was cached. Since the seed is relative to "today", that's effectively every day.
- **Don't overlap with an e2e run.** Both reseed the same athlete. `docs/e2e.md` already says to run one at a time.
- **Timezone:** the seed takes "today" from the Mac. On Expo Simulators the app takes it from the cloud device, and `docs/e2e.md` flags the risk of a mismatch near midnight. With `--simulator local`, the simulator shares the Mac's clock.

## Risks

1. **EAS environment variables (blocks the build, not just sign-in).** Explore requires that the capture profile's "Expo Services environment cannot have secret-visibility or file variables" (README, Requirements). `src/capture/eas-build.ts`: "secret-visibility values never leave Expo Build builders, and file variables are not repacked", and doctor reports `CAPTURE_OBSERVER_BUILD_UNSUPPORTED`. Our `e2e` profile uses `environment: development`. `README.md` stores the Dev Firebase configs there as `--type file --visibility sensitive`, and `app.config.ts` reads the staging ones from `GOOGLE_SERVICE_INFO_STAGING_PLIST`/`GOOGLE_SERVICES_STAGING_JSON` the same way. Without the staging Firebase config the app can't sign in. **_unverified_:** whether Explore objects to the variables in the environment or only to ones the build reads. It needs `doctor` (it runs `eas env:list`, which shows names and masks values). Separately, with `--simulator local` the repack runs in a temporary worktree where the gitignored `/firebase` folder doesn't exist. **_unverified_:** whether the repack evaluates `googleServicesFile`. This belongs to the build-profile ticket, but sign-in depends on it.
2. **Firebase persistence.** It isn't a risk across sides: each commit gets a fresh device or session (above). Within a side the session lasts across root-link resets and per-appearance relaunches, which is what we want. The app has no sign-out step in setup, so a run can't capture signed-out screens after sign-in. Order matters.
3. **Two builds, two sign-ins.** Base and head each sign in at least once, more if light and dark run in separate sessions (`capture.maxSessions`). That's several staging sign-ins per review. Firebase only locks an account after many _failed_ sign-ins (`docs/e2e.md`), so a wrong password in the env could lock the e2e account and break the e2e suite too.
4. **Appearance.** The app forces dark at runtime (`Appearance.setColorScheme('dark')` in `app/_layout.tsx`), but `userInterfaceStyle` is `automatic`. With `capture.appearance: auto`, Explore captures "light" and "dark", and both will be dark. Set `capture.appearance: dark`, which also halves the sign-ins.
5. **Live data noise.** "Today"-relative seed data, Intervals.icu wellness numbers on Fitness, and Calendar dates differ between days. Expect Screen variants. Use `--no-cache` (above).
6. **Labels in Polish.** Setup `label`s must be the Polish texts, and renames break deterministic steps (README, "Keep your setup current"). Cloud iOS is English for system sheets only. Explore handles the save-password sheet itself.
7. **Expo Simulators access** is a waitlisted preview. We already use it for `e2e:cloud`, so the account has access. `--simulator local` is the fallback, and it creates its own simulators, so it doesn't touch "BH e2e iPhone".

## Open questions for the owner

- Email in config: plain text (Settings captured, email committed) or `{{secret:}}` (Settings not captured)?
- Detail routes: setup taps, stable seed ids, agent mode, or exclude?
- Mode for by-hand runs: deterministic, or agent on the dev's Claude login?
- `/verify-email`: exclude?
