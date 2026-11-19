# Research: does the Dev build fit the EAS plan

Ticket: [#316](https://github.com/Wojtas399/bh-cycling-app/issues/316) · Map: [#313](https://github.com/Wojtas399/bh-cycling-app/issues/313) · Researched 2026-11-09

## Answer

**It fits the Free plan, but iOS has little headroom.** In a busy month like October 2026, Dev builds plus staging builds would have used about **13 of 15 iOS builds** and **11 of 15 Android builds**. Updates are nowhere near any limit. The Free plan has no overage billing. Once a platform's 15 builds are used, more builds on that platform are blocked until the 1st of the next month.

**Cheapest adjustment (free, recommended):** stop `package.json` scripts from changing the native fingerprint. Then a scripts-only merge doesn't trigger a Dev build. That would have saved 2–3 builds per platform in October. Pair it with a **fail-soft quota rule** in the Dev routing: when a Dev build can't start, warn and skip it, so `main` stays green and staging keeps its builds. No paid plan is needed. The paid fallback, Starter at $19/month, only matters if the project starts changing native code much more often.

## The account's plan

These numbers come from `eas account:usage wojtas --json --non-interactive`, run 2026-11-09. The command is read-only.

|                  | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| Plan             | **Free**                                                  |
| Builds           | 15 iOS + 15 Android per month (0 used so far in November) |
| Concurrency      | 5 in total, **1 iOS (macOS)**                             |
| Billing period   | Calendar month (2026-11-01 → 2026-12-01)                  |
| Update MAU       | 6 used of 1,000                                           |
| Update bandwidth | 25.4 MiB used of 100 GiB                                  |
| Overage          | none, and the estimated total is $0                       |

## Free plan terms (official Expo sources)

- **Builds:** "15 Android and 15 iOS builds" per month. The limit is per platform, not a pooled 30. ([pricing](https://expo.dev/pricing.md))
- **When the quota runs out:** "Free plan accounts do not incur overage charges. Once you use your monthly quota of free builds, new builds are unavailable until the quota resets on the first day of the next calendar month. To keep building without waiting for the reset, upgrade to the Starter plan or run builds locally." ([billing FAQ](https://docs.expo.dev/billing/faq.md))
- **Queue:** low priority. "At peak times, you may experience wait times of 90+ minutes with the low-priority queue." ([pricing](https://expo.dev/pricing.md))
- **Timeout:** 45 minutes per build. ([pricing](https://expo.dev/pricing.md))
- **Concurrency:** "5 concurrencies, up to 1 on macOS". ([pricing](https://expo.dev/pricing.md))
- **EAS Update:** 1,000 MAU, 100 GiB bandwidth and 20 GiB storage, with unlimited updates. "The Free plan has no update overage pricing; it is limited to its included monthly active users." ([pricing](https://expo.dev/pricing.md))
- **What counts as an MAU:** "a unique installation of your app on a device" that downloads at least one update in the billing month. ([usage-based pricing](https://docs.expo.dev/billing/usage-based-pricing.md), [FAQ](https://docs.expo.dev/billing/faq.md))
- **Internal distribution builds** (iOS ad hoc, Android APK): no official page treats them differently. They are ordinary EAS cloud build jobs, so each one uses one build from its platform's quota. Our own October history confirms this: the `staging` iOS builds with `distribution: INTERNAL` ran as normal quota builds.
- **Failed builds:** since 2024-05-01, builds that fail fast don't count against the Free quota ([changelog](https://expo.dev/changelog/2024-05-02-fast-failed-builds-exclusion)). A build that fails later in the job still counts.
- **Local builds** (`eas build --local`): the FAQ's advice to "run builds locally" when the quota is exhausted implies that local builds don't use the quota. An Expo forum reply says so directly ([forum](https://forums.expo.dev/t/does-local-eas-build-also-count-as-a-part-of-paid-services/73900)). No official page states it outright.
- **Starter, for comparison:** $19/month includes $45 of build credit and the high-priority queue, with a 2-hour timeout. A medium build costs $1 on Android and $2 on iOS. 3,000 MAU. ([pricing](https://expo.dev/pricing.md), [plans](https://docs.expo.dev/billing/plans.md))

## What changes the native fingerprint here

`app.config.ts` sets `runtimeVersion: { policy: 'fingerprint' }`. Running `npx @expo/fingerprint fingerprint:generate --platform ios` on HEAD shows that the hash covers more than native dependencies:

- **Native modules:** the autolinked module directories, including iOS and Android code.
- **Config plugins:** the source of each plugin.
- **`expoConfig`:** the resolved app config, which includes `version`, the icons and the plugins.
- **`packageJson:scripts`:** every npm script.
- **`.gitignore`** (`bareGitIgnore`) and **`eas.json`** (`easBuild`).
- **Assets the config references:** the icon variants and the splash screen.

JS-only dependencies such as TanStack Query, react-hook-form and react-native-marked do **not** change the fingerprint.

## Usage from `main` history

`git log origin/main --first-parent` shows 42 merges between the Expo SDK 57 upgrade (2026-10-05) and 2026-11-09. Busy months have 36 merges (October). Quiet months have 1–6.

These merges changed the fingerprint:

| Merge             | Why it changed the fingerprint                   |
| ----------------- | ------------------------------------------------ |
| #35 SDK 57        | native dependencies and config                   |
| #70 @expo/ui      | native module and a scripts change               |
| #93 sonner-native | adds react-native-svg, a native module           |
| #55 worktree:link | **scripts only**                                 |
| #163 Route map    | MapLibre native module and plugin                |
| #215 versioning   | `version` in the app config\*                    |
| #216 release flow | expo-updates, eas.json and config                |
| #228 rc/0.0.1     | icons, eas.json and config                       |
| #293 e2e          | Gradle config plugin, .gitignore and **scripts** |

\* A `version` change only produces a new Dev build if the Dev routing reads `version` from `app.config.ts` on `main`. The versioning decision (#317) settles that.

**Dev builds needed:** about 9 per platform over 5 weeks, peaking at **7 per platform in October**. November so far has 2.

**Staging and production builds:** in October, EAS ran 6 iOS and 4 Android staging builds, plus 1 iOS spike build. Their run times were 11–24 minutes and they mostly queued for under 2 minutes. That is far from the 45-minute timeout.

### Peak-month budget (October-like)

|                                           | iOS         | Android     |
| ----------------------------------------- | ----------- | ----------- |
| Dev builds (one per fingerprint change)   | 7           | 7           |
| Staging and production (October actuals)  | 6           | 4           |
| **Total / limit**                         | **13 / 15** | **11 / 15** |
| With scripts dropped from the fingerprint | ~11 / 15    | ~9 / 15     |

Other risks to the iOS budget:

- **The bootstrap month.** Adding the `dev` profile to `eas.json` changes the fingerprint, and the first Dev build needs builds too.
- **Registering a new iOS device.** The ad hoc provisioning profile changes, so the Dev build must be rebuilt.
- **Pushes that land before a Dev build finishes.** Without a concurrency group, two pushes with the same new fingerprint could each start a build.
- **Only one macOS slot.** Staging and Dev iOS builds run one after another, never side by side.

### Updates

The Dev build adds one or two installs, the owner's phones, to the 6 MAU in use today. That is well under the 1,000 limit. About 40 OTA updates a month to 2 devices at a few MB each comes to well under 1 GB of bandwidth, against a limit of 100 GiB. Storage grows with each published update group, but slowly. Old Dev update groups can be deleted if the 20 GiB storage limit ever gets close.

## Adjustments, cheapest first

1. **Drop `packageJson:scripts` from the fingerprint**, using `fingerprint.config.js` with `sourceSkips` or a `fileHookTransform` ([fingerprint docs](https://docs.expo.dev/versions/v57.0.0/sdk/fingerprint/)). This is free, and it saves the scripts-only rebuilds (#55, and #70 and #293 counted for their scripts too). The change itself shifts the hash once, so the next rc needs a new staging build.
2. **Fail soft on quota:** when a Dev build can't be queued, the Dev routing warns and skips it. The Dev build then falls behind `main` until the 1st of the month, while staging keeps its builds. This is free.
3. **Add a concurrency group** for the Dev job on `main`, so builds for the same fingerprint aren't started twice. This is free.
4. **Build Android Dev builds locally** with `eas build --local` on GitHub's Linux runners. This is free within the Actions minutes and takes Android off the quota. Building iOS locally would need a macOS runner, which uses private-repo Actions minutes at 10×, or the owner's Mac. Not worth it unless the iOS quota really runs out.
5. **Starter plan at $19/month,** only if native changes become much more frequent. Its credit covers about 22 iOS builds or 45 Android builds.
