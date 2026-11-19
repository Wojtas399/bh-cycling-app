# Does the `e2e` EAS profile meet Explore's build requirements?

Research for #409 (map #408). Researched 2026-11-19. Sources:

- The `expo/explore` repo on GitHub: `README.md`, `docs/quickstart-ci.md`, `CI-FLOW.md` and `skills/explore-setup/SKILL.md`.
- The published `@expo/explore@0.23.0` package from npm (latest, 2026-10-30), mainly `dist/ci/doctor.js`, `dist/capture/eas-build.js` and `dist/capture/run.js`. Where the docs and the code differ, the code wins.
- Our `eas.json` and `app.config.ts` on `main`, and the README section "After Spec #361 merges".
- Read-only eas-cli 27.7.2 calls: `eas config --platform ios --profile e2e --json`, `eas simulator:availability --json`, and `eas env:list` for `development` and `preview`, project and account scope. Only variable names, visibility and type are recorded here, never values.

Nothing was created, changed or deleted on EAS, and no build or simulator session ran. `npx @expo/explore doctor` was not run, because without `.expo-explore/config.yaml` it only reports that the config is missing (SKILL.md, steps 1–2). Its checks were redone by hand from its source.

## Short answer

**Not yet, but close. The profile itself qualifies. The `development` environment it builds with fails one check, because of six secret-visibility variables. All six are leftovers that the README already tells the owner to delete.**

- The profile passes. It has `ios.simulator: true`, no `developmentClient`, bundle id `com.wojtas.blackhorsecyclingapp.staging` and scheme `blackhorsecyclingapp`. Expo Simulators is available on the account. Android `buildType: apk` passes too.
- It fails `CAPTURE_OBSERVER_BUILD_UNSUPPORTED`: `development` has 6 **secret**-visibility variables. They are `CLAUDE_CODE_OAUTH_TOKEN`, `E2E_INTERVALS_API_KEY`, `E2E_INTERVALS_ATHLETE_ID`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` and `EXPO_TOKEN`. The app build doesn't read any of them. They're step 2 of README "After Spec #361 merges", which says to delete them from `development`.
- The 4 Firebase **file** variables don't trip `doctor`, because they have `sensitive` visibility. With the default hosted repack (Expo Simulators) they're fine. They do block `capture.simulator: local` / `capture.repack: local`, the local-Mac fallback.
- **Recommendation:** reuse `e2e` once the owner has deleted those six secrets. No dedicated `explore` profile is needed for iOS on Expo Simulators. A separate profile only helps if the local-simulator fallback is wanted, and even then it needs the Firebase plists from somewhere other than file variables. See "If we wanted a dedicated `explore` profile".

## What Explore requires

From the README ("Requirements"): "An Expo Build profile per platform: `ios.simulator: true` for iOS, `android.buildType: apk` (not a development build) for Android. Its Expo Services environment cannot have secret-visibility or file variables." Step 2 of the quick start ("App readiness") adds supported Expo and navigation versions and a URL scheme. SKILL.md step 2 adds Node 24.12+.

What the code actually enforces (`@expo/explore@0.23.0`):

| Check             | Where                                                                 | Rule                                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulator profile | `assertCaptureEasProfile` in `dist/capture/eas-build.js`              | iOS: the resolved `buildProfile.simulator === true`, else `EAS_PROFILE_NOT_SIMULATOR`. Android: `buildType === "apk"` (or unset with internal distribution) and not `developmentClient`.                  |
| Bundle id         | same                                                                  | The resolved `appConfig.ios.bundleIdentifier` equals `app.bundleId` in the config, else `APP_BUNDLE_ID_MISMATCH`.                                                                                         |
| Scheme            | `dist/ci/doctor.js`                                                   | The resolved `appConfig.scheme` includes `app.scheme`, else `APP_SCHEME_MISMATCH`. `APP_SCHEME_MISSING` when there is none.                                                                               |
| Environment       | `unreproducibleEasVariables` in `eas-build.js`, called by `doctor.js` | Runs `eas env:list <env> --scope project` and `--scope account`. Flags each line matching `NAME=***** (This is a (secret\|file) env variable`. Any match fails with `CAPTURE_OBSERVER_BUILD_UNSUPPORTED`. |

The source comment explains why the environment rule exists: "secret-visibility values never leave EAS builders, and file variables are not repacked". Explore rebuilds the JS bundle with a route observer ("repack") on top of a native EAS build:

- **Hosted repack** (`capture.repack: eas`, the default unless `capture.simulator: local`; `dist/config/explore-config.js`). This is an Expo Workflows `type: repack` job with `environment: <profile's env>` and `js_bundle_only: true` (`hostedRepackWorkflow`). It runs on EAS, so the environment's secrets and files are available there. The capture path (`prepareExactSourceBuild`) makes **no** environment check before a hosted repack. Only `doctor` fails it.
- **Local repack** (`capture.repack: local`, the default with `capture.simulator: local`). This runs `eas env:pull` and refuses the environment if it holds any secret variable, or any variable whose value is a file pulled under `.eas/.env/` (`pulledEnvironment`). Capture then fails with `CAPTURE_OBSERVER_BUILD_UNSUPPORTED`. This check doesn't look at visibility, so sensitive file variables are refused too.

So `doctor` is stricter than a hosted capture about secrets, and looser than a local capture about sensitive files. The doctor fail is the one to clear, since SKILL.md says setup is complete only when doctor passes.

## Our `e2e` profile, check by check

`eas config --platform ios --profile e2e --json` resolves to `simulator: true`, `withoutCredentials: true`, `environment: "development"`, `env.APP_ENV: "staging"` and `distribution: "store"`, with no `developmentClient`.

| Requirement                                         | Ours                                                                                          | Result                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `ios.simulator: true`                               | `true`                                                                                        | Pass                                                        |
| Not a development client                            | `developmentClient` unset (the `dev-client` profile is separate)                              | Pass                                                        |
| Android APK                                         | `android.buildType: "apk"`                                                                    | Pass                                                        |
| Bundle id                                           | `com.wojtas.blackhorsecyclingapp.staging` (`APP_ENV=staging` in `app.config.ts`'s `IDENTITY`) | Pass. Set `app.bundleId` to this.                           |
| Scheme                                              | `blackhorsecyclingapp`, static in `app.config.ts`                                             | Pass                                                        |
| Expo SDK 57+, Expo Router 57+                       | `expo ~57.0.26`, `expo-router ~57.0.24`                                                       | Pass                                                        |
| Node 24.12+                                         | Local `v24.15.0`                                                                              | Pass                                                        |
| Expo Simulators access                              | `eas simulator:availability` returns `available: true` for account `wojtas`                   | Pass                                                        |
| No secret variables in the env                      | 6 secret variables in `development` (below)                                                   | **Fail**                                                    |
| No file variables in the env (as `doctor` reads it) | 4 file variables, all `sensitive`, so `env:list` prints them as "sensitive", not "file"       | Pass for `doctor` and hosted repack. Fail for local repack. |

`withoutCredentials: true` doesn't matter here: Explore never checks it, and simulator builds need no signing.

`app.config.ts` defaults `APP_ENV` to `staging`, so `expo-explore setup` reads the staging bundle id and scheme even without the profile's env. Quick start: "Config evaluation uses your current shell environment ... If a build profile changes the bundle identifier or scheme ... supply `--bundle-id` and `--scheme` explicitly". Ours match, so no override is needed.

### The `development` environment (project scope; account scope is empty)

| Name                                | Visibility | Type   | Used by the app build?                    | `doctor` flags it? |
| ----------------------------------- | ---------- | ------ | ----------------------------------------- | ------------------ |
| `CLAUDE_CODE_OAUTH_TOKEN`           | SECRET     | string | No (old EAS e2e workflow)                 | Yes                |
| `E2E_INTERVALS_API_KEY`             | SECRET     | string | No (e2e seed reads `.env.local`)          | Yes                |
| `E2E_INTERVALS_ATHLETE_ID`          | SECRET     | string | No (e2e seed)                             | Yes                |
| `E2E_USER_EMAIL`                    | SECRET     | string | No (e2e sign-in helper)                   | Yes                |
| `E2E_USER_PASSWORD`                 | SECRET     | string | No (e2e sign-in helper)                   | Yes                |
| `EXPO_TOKEN`                        | SECRET     | string | No (release reads the GitHub secret)      | Yes                |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`  | PUBLIC     | string | Yes (`lib/firebase.ts`)                   | No                 |
| `EXPO_PUBLIC_INTERVALS_CLIENT_ID`   | PUBLIC     | string | Yes (`hooks/useIntervalsAuth.ts`)         | No                 |
| `GOOGLE_SERVICES_DEV_JSON`          | SENSITIVE  | file   | Yes (`app.config.ts`, `dev` builds)       | No                 |
| `GOOGLE_SERVICES_STAGING_JSON`      | SENSITIVE  | file   | Yes (`app.config.ts`, staging/e2e builds) | No                 |
| `GOOGLE_SERVICE_INFO_DEV_PLIST`     | SENSITIVE  | file   | Yes (`app.config.ts`, `dev` builds)       | No                 |
| `GOOGLE_SERVICE_INFO_STAGING_PLIST` | SENSITIVE  | file   | Yes (`app.config.ts`, staging/e2e builds) | No                 |

The short `env:list` output, which `doctor` parses, prints the four file variables as `***** (This is a sensitive env variable ...)`. That's why the `(secret|file)` regex misses them. This depends on eas-cli's wording, so a future eas-cli or Explore release could start flagging them (**_unverified_**).

The six secrets are the "e2e workflow's other secrets" plus `EXPO_TOKEN`. README "After Spec #361 merges", step 2: "`EXPO_TOKEN` can be deleted from the EAS environments. Also delete the e2e workflow's other secrets from the EAS `development` environment: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_INTERVALS_API_KEY`, `E2E_INTERVALS_ATHLETE_ID` and `CLAUDE_CODE_OAUTH_TOKEN`." Nothing in the repo reads them from EAS today. The e2e suite reads them from `.env.local` (`e2e/support/athlete.ts`, `docs/e2e.md`). Deleting them doesn't affect the `dev`, `staging` or `e2e` builds.

## What reuse needs

1. The owner deletes the six secret variables from `development`, as README already says. This is a manual EAS change. It is out of scope for this research and for agents.
2. `.expo-explore/config.yaml` with `app.easProfile: e2e`, `app.bundleId: com.wojtas.blackhorsecyclingapp.staging` and `app.scheme: blackhorsecyclingapp`.
3. Leave `capture.repack` at its default (`eas`) while capturing on Expo Simulators.
4. Run `npx @expo/explore doctor` until it exits 0. The `eas-environment` check should read "EAS environment development ... has no variables that stop capture from rebuilding the app."

### Side effects of sharing the profile with the e2e suite

- **Shared builds help.** Explore reuses "a finished simulator build with the same fingerprint" for the profile (CI-FLOW §4, stage 3). An `e2e:cloud:ios` build and an Explore capture of the same native code can share one build, and the other way round. This saves build credit.
- **Repacks show up in the `e2e` build list.** Each capture adds a build under the `e2e` profile with the message `expo-explore ios capture: route observer repack ...`. The e2e suite picks builds by explicit id (`E2E_IOS_BUILD_ID`), so nothing breaks. Just don't copy an id of a repack into `E2E_IOS_BUILD_ID`, because it carries the route observer and that commit's JS.
- **Firebase files.** A hosted repack runs with `environment: development`, so `app.config.ts` still finds the staging plist through `GOOGLE_SERVICE_INFO_STAGING_PLIST`. A `js_bundle_only` repack shouldn't need the plist at all, because it keeps the native build's. Whether the hosted job evaluates `app.config.ts` in a way that requires it is **_unverified_** until a first `doctor --capture`.

## If we wanted a dedicated `explore` profile

It's only worth it to run captures on a local Mac simulator (`capture.simulator: local`), where repack runs locally and refuses file variables of any visibility. Such a profile would need:

- `ios.simulator: true`, `env.APP_ENV: "staging"`, no `developmentClient`. `withoutCredentials` is optional.
- An `environment` with **no secret and no file variables**, holding only the public `EXPO_PUBLIC_*` values. The built-in `preview` environment isn't such an environment either: it has `GOOGLE_SERVICES_STAGING_JSON` and `GOOGLE_SERVICE_INFO_STAGING_PLIST` (both SENSITIVE file) plus `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and it lacks `EXPO_PUBLIC_INTERVALS_CLIENT_ID`. Whether our plan allows a custom EAS environment wasn't checked (**_unverified_**).
- Another way to get the staging Firebase plist into the native build, because `app.config.ts` copies it from the file variable. This is the real cost, and the reason not to go this way unless local capture turns out to be necessary.

For Android later (map #408, "Not yet specified"), the same `e2e` profile already passes the APK check, so `explore-android` can probably point at `e2e` too.

## Open questions

- Does the first hosted `doctor --capture` on `e2e` repack cleanly with the Firebase file variables present? (**_unverified_**, costs a build or repack.)
- Will a future Explore or eas-cli flag `sensitive` file variables? That would make the four Firebase variables fail `doctor` and force the dedicated-environment route.
