# Research: versioning options for Dev builds from `main`

Ticket: #315 (map #313). Decision belongs to #317. Researched 2026-11-09 against `main` at `01b2d3e`, eas-cli 18.9.1, `@expo/fingerprint` 0.20.13 (Expo SDK 57).

## Gist

`version` on `main` is pinned at `'0.0.1'`, because `release.sh` never commits the version it sets. In this SDK's fingerprint, **`version` is part of the native fingerprint**, so changing the version string forces a new build. Remote build numbers are tracked per platform and bundle ID, so a `.dev` bundle gets its own counter. The fingerprint, channel and bundle ID already settle OTA compatibility. The Dev build therefore doesn't need a meaningful version, and anything that moves the version string costs a rebuild.

## Facts

### 1. What `version` holds on `main`, and how it moves

- `app.config.ts` hard-codes `version: '0.0.1'`. It was set by #215 (`7f3e485`). Before that it was `'1.0.0'`, from `46a0fb2`.
- `scripts/release.sh` `set_version` rewrites the line in the CI checkout only: "The edit stays in this checkout because EAS uploads the working tree, so nothing is committed back."
- The `rc/0.0.1` merge back (`2260db4`, #228) touched `app.config.ts` but left `version` at `'0.0.1'`. `git log --first-parent main -- app.config.ts` shows no version bump after #215.
- So **`main` doesn't follow releases**. It reads `0.0.1` until someone bumps it by hand. Merging `rc/0.0.2` back won't change it either, because the rc branch never commits the bump.

### 2. `version` is part of the fingerprint (SDK 57)

- Source: `node_modules/@expo/fingerprint/build/sourcer/Expo.js` `normalizeExpoConfig` drops `version`, `android.versionCode` and `ios.buildNumber` only when `SourceSkips.ExpoConfigVersions` is set.
- `build/Options.js`: `DEFAULT_SOURCE_SKIPS = SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun`, which excludes `ExpoConfigVersions`. The repo has no `fingerprint.config.js`.
- **Empirical check** (`createFingerprintAsync('.', {platforms:['ios']})`):
  - `0.0.1` → `a6a94911…`
  - `0.0.2` → `b2f7753b…`
  - `APP_ENV=dev` → `61a4d3c5…`

  So both a version bump and the `APP_ENV` value (which lands in `extra.appEnv`, plus name, bundle ID and icon) change the hash.

- Consequences:
  - A Dev build's fingerprint never matches a staging build's, which is fine.
  - **Any version change on the Dev path means a new Dev build, even with no native change.**
  - `.fingerprintignore` already excludes `firebase/**`.
- Docs caveat: the SDK 58 Fingerprint reference (https://docs.expo.dev/versions/latest/sdk/fingerprint/) describes presets. `strict` is "highest fidelity - even a version bump changes the fingerprint. The historical default". `balanced` is "the default". The page implies, without stating, that `balanced` ignores versions. **Recheck this after the SDK 58 upgrade.** It may change the hash for every existing build and change which versioning options cost rebuilds. `SourceSkips.ExpoConfigVersions` in `fingerprint.config.js` opts out explicitly in either SDK.

### 3. How OTA compatibility is decided

- https://docs.expo.dev/eas-update/how-it-works/: "The platform of the build and the target platform of an update must match exactly." and "The runtime version of the build and the target runtime version of an update must match exactly." A build gets updates from the branch its channel links to, which by default is the branch with the same name.
- https://docs.expo.dev/eas-update/runtime-versions/: the `fingerprint` policy "will increment the runtime version whenever anything that may impact the native runtime changes."
- The version string plays no separate part in OTA delivery. It only matters through the fingerprint (fact 2). A `dev` channel isolates Dev updates from staging and production on its own.

### 4. `eas build:list` filters

- Help output in eas-cli 18.9.1 (`eas build:list --help`) lists these filters: `--channel`, `--app-version`, `--app-build-version`, `--runtime-version`, `--fingerprint-hash`, `--app-identifier`, `-e/--build-profile`, `--distribution`, `--status`, `--git-commit-hash`, `--sdk-version`, plus `--limit` (default 10, max 50).
- Each flag only narrows the results, and a flag you leave out applies no filter (`commands/build/list.js` passes `appVersion: flags['app-version']` straight through). So without `--app-version`, a channel plus fingerprint query matches builds of any version.
- `--app-identifier` and `--build-profile` can pin the query to the `.dev` bundle or `dev` profile without a version.

### 5. Remote app version source

- https://docs.expo.dev/build-reference/app-versions/: "Expo servers can store and manage your app's developer-facing build version (`android.versionCode` and `ios.buildNumber`) remotely." `autoIncrement` "does not support the `version` option". The user-facing `version` (`CFBundleShortVersionString` / `versionName`) always comes from app config. "The remote version is initialized with the value from the local project."
- Keying, from the eas-cli source (`graphql/queries/AppVersionQuery.js`): `latestAppVersionByPlatformAndApplicationIdentifier(platform, applicationIdentifier)` returns `{storeVersion, buildVersion}`. **The counter is per platform and per bundle ID.** A `com.wojtas.blackhorsecyclingapp.dev` app gets its own counter, independent of staging, so it can't clash. The docs page doesn't state this keying.
- The remote record holds `storeVersion` next to `buildVersion`, but the docs and CLI only manage `buildVersion` remotely.
- For ad hoc or APK internal distribution, no store enforces increasing build numbers. `autoIncrement` on a `dev` profile is optional. It mainly helps an iOS install replace an older Dev build cleanly and keeps builds easy to tell apart.

## Options

| Option                                                                                        | How                                                                                                                        | Pros                                                                                          | Cons                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Fixed version** (e.g. `0.0.0` or `dev`-agnostic constant set by `release.sh` for `main`) | `set_version 0.0.0` on the `main` route; match with `--channel dev --app-version 0.0.0 --fingerprint-hash`                 | Rebuilds only on real native changes. Same `has_matching_build` shape as rc. Nothing to bump. | The version shown on the device carries no information. Builds are told apart by build number and commit.                                                                                                                                                                                                                                                  |
| **B. Version from `app.config.ts`** (do nothing)                                              | Skip `set_version` and pass `--app-version` from the config value (`0.0.1` today)                                          | No new constant. If someone bumps `main` by hand, the Dev build follows.                      | The value is stale today (`0.0.1` forever, fact 1). Any hand bump forces a Dev rebuild through the fingerprint even without a native change. It suggests a link to releases that doesn't exist.                                                                                                                                                            |
| **C. `dev`-suffixed version** (e.g. `0.0.1-dev`, or the next rc's semver plus `-dev`)         | `set_version` with a computed suffix                                                                                       | Shows on the device what the build is.                                                        | Apple `CFBundleShortVersionString` must be up to three dot-separated integers, so `-dev` is invalid there. This needs checking against Apple docs before choosing. It would at least need the suffix kept out of iOS. A suffix derived from a moving value (latest rc, date, SHA) changes the fingerprint and rebuilds on every change, which defeats OTA. |
| **D. Fingerprint-only matching**                                                              | Drop `--app-version` on the `main` route, match on `--channel dev --fingerprint-hash` (optionally `--app-identifier …dev`) | Simplest query. The version string doesn't matter to routing.                                 | `version` still feeds the hash, so it must stay stable anyway, which collapses into A or B in practice. Optionally add `ExpoConfigVersions` to `sourceSkips`, which also changes staging and production fingerprints. That is a one-time rebuild everywhere and drops version from the rc matching guarantee.                                              |

Cross-cutting notes for #317:

- Any option that changes the version string per commit forces a build on every merge to `main`, given fact 2.
- A and D compose. Pin the version (A) and match on channel plus fingerprint. Whether to also pass `--app-version` then makes no difference.
- `autoIncrement: true` on the `dev` profile is safe because its counter is separate (fact 5).
- The SDK 58 `balanced` preset may silently remove `version` from the hash (fact 2 caveat). Pinning `sourceSkips` explicitly in `fingerprint.config.js` would make the behaviour stable across the upgrade either way.

## Open checks

- Apple's rules for `CFBundleShortVersionString` on ad hoc builds, if option C stays in play. This came from memory of Apple docs and wasn't verified here.
- The exact default `sourceSkips` for the SDK 58 `balanced` preset. Read it from `@expo/fingerprint` source after the upgrade.
