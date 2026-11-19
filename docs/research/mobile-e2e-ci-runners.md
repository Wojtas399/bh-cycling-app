# CI runner options for native mobile e2e (iOS + Android) on PRs

Research for #115 (map #108). Researched 2026-10-15. Prices are from the vendors' live pricing pages on that date unless noted. Run times marked _(estimate)_ are not from a vendor source. They are rough figures for an Expo SDK 57 / RN 0.86 app like ours, which uses CNG and has no committed `ios/` or `android/` directories.

## Summary table

| Option                                                            | Platforms                                                           | Setup effort                                                                                                                         | Typical PR run time _(estimate)_                                                              | Cost (private repo)                                                                                                                                            | Framework ties                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **A. GH Actions `ubuntu-latest` + KVM + android-emulator-runner** | Android only                                                        | Medium: prebuild + Gradle build, KVM udev step, AVD snapshot cache                                                                   | 15–30 min cold, 8–15 min with Gradle + AVD cache                                              | $0.006/min. Counts against the 2,000 (Free) or 3,000 (Pro/Team) included minutes, so it is effectively free at our volume                                      | None. Works with Maestro, Detox, TesterArmy `e2e` (agent-device), or anything else that drives `adb`           |
| **B. GH Actions macOS runner + iOS Simulator**                    | iOS (Android not practical, because arm64 macOS has no nested virt) | Medium–high: Xcode pinning, `expo prebuild`, `xcodebuild` for simulator, CocoaPods/DerivedData caching                               | 20–40 min cold, 10–20 min cached                                                              | $0.062/min (3-core M1). Roughly $1.20–2.50 per iOS run. Historically billed at 10x against included minutes (see note)                                         | None. Same as A                                                                                                |
| **C. EAS Workflows (`build` + `maestro` job)**                    | iOS + Android                                                       | Low: an `e2e-test` profile in `eas.json` + `.eas/workflows/*.yml`. Native GitHub PR trigger                                          | Build 10–20 min (skippable via `fingerprint` → `get-build`/`repack`) + test job a few minutes | Build $1 Android / $2 iOS (medium). Maestro job $0.05 + CI minutes ($0.020/min Linux nested-virt, $0.075/min macOS medium). Starter $19/mo includes $45 credit | **Maestro only** (`maestro` / `maestro-cloud` job types). Other tools need a hand-rolled custom job            |
| **D. Maestro Cloud**                                              | iOS + Android (+ web)                                               | Low: upload an APK or zipped `.app` via `mobile-dev-inc/action-maestro-cloud` or the EAS `maestro-cloud` job. You still need a build | Mostly the build. Tests run in parallel across devices                                        | **$250 per device per month** (concurrency-based, unlimited runs). Free trial (length not stated)                                                              | **Maestro only**                                                                                               |
| **E. TesterArmy hosted platform**                                 | iOS + Android (+ web)                                               | Low–medium: EAS Workflow that builds, runs `npx testerarmy upload-app`, then `npx testerarmy ci`. GitHub integration for checks      | Build time + agent run (each run capped at 20 min)                                            | Free: 5 runs total. Hobby $99/mo: 250 runs, 3 concurrent. Startup $299/mo: 1,000 runs, 10 concurrent. Build cost (C or A/B) is extra                           | **TesterArmy only** (natural-language agent tests). The OSS `tester-army/e2e` framework can instead run on A/B |

## Option details

### A. GitHub Actions ubuntu + KVM Android emulator

- Private-repo `ubuntu-latest` is 2 vCPU, 8 GB RAM, 14 GB SSD, x64. GitHub-hosted Linux runners "support hardware acceleration for Android SDK tools". [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- `reactivecircus/android-emulator-runner@v2` recommends `ubuntu-latest`. Its README says these runners are 2–3x faster than macOS for emulators and much cheaper. KVM is enabled with a udev-rule step (`/etc/udev/rules.d/99-kvm4all.rules`). Supported `arch` values are `x86`, `x86_64`, and `arm64-v8a`. The default boot timeout is 600 s. [android-emulator-runner README](https://github.com/ReactiveCircus/android-emulator-runner)
- **Caching:** the README's recommended setup:
  - Gradle cache via `gradle/actions/setup-gradle`.
  - `actions/cache` for `~/.android/avd/*` and `~/.android/adb*`, keyed by API level.
  - Generate a snapshot on a cache miss, then run with `no-snapshot-save`.
  - Also cache `node_modules` (npm cache is already used in our `ci.yml`).
  - Cache storage is 10 GB per repo, free. [Billing for Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- **Cost:** Linux 2-core costs $0.006/min. [Runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing) Included minutes are 2,000 (Free) and 3,000 (Pro/Team). [Billing for Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) Example: 20 runs of 20 min per month = 400 min, which fits inside the free quota.
- **Gotcha:** a 2-core, 8 GB runner doing a Gradle release build _and_ running an emulator is tight. Expect flakiness and slow boots unless both caches are warm.

### B. GitHub Actions macOS runner (iOS Simulator)

- Private-repo `macos-latest`/`macos-15` (arm64) has 3 M1 cores, 7 GB RAM, and 14 GB SSD. `macos-15-intel` has 4 CPUs and 14 GB RAM. arm64 macOS runners **do not support nested virtualization** (an Apple Virtualization Framework limit), so this option is not viable for Android emulators. [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) x86_64 macOS images are supported only until about August 2027. [runner-images #13045](https://github.com/actions/runner-images/issues/13045)
- **Cost:** $0.062/min for 3/4-core macOS. Larger runners: 12-core Intel `macos_l` is $0.077/min and 5-core M2 Pro `macos_xl` is $0.102/min. Larger runners require Team or Enterprise Cloud and cannot use included minutes. [Runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)
- **Note on multipliers:** older GitHub docs said macOS consumes included minutes at **10x** (Windows at 2x). The current billing page expresses cost only as per-minute rates and no longer states a multiplier. [Billing for Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) Treat macOS usage as quickly eating the free quota. 2,000 included minutes is about 200 macOS minutes, or about 8–10 iOS runs.
- **2026 pricing changes:** hosted-runner prices dropped "up to 39%" on 2026-01-01. The announced $0.002/min self-hosted platform fee (originally due 2026-03-01) was **postponed** with no new date (GitHub update dated 2025-12-15). [GitHub: 2026 pricing changes](https://github.com/resources/insights/2026-pricing-changes-for-github-actions)
- **Caching:** CocoaPods (`ios/Pods`, keyed on `Podfile.lock`), DerivedData, and `node_modules`. Our project uses CNG, so `expo prebuild` runs first in every job.

### C. EAS Workflows (Expo-hosted CI)

- **Native Maestro support:**
  - A `build` job using a profile with `ios.simulator: true` / `android.buildType: "apk"` and `withoutCredentials: true`.
  - Then a `maestro` job with `build_id` and `flow_path`.
  - Triggered by `on: pull_request`.
  - [EAS e2e guide](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
- **`maestro` job options:** `shards`, `retries`, `record_screen`, and tags. Status: "Maestro tests are in alpha". Android emulator tests need a `linux-*-nested-virtualization` worker. iOS needs `macos-*`. A separate `maestro-cloud` job type sends the build to Maestro Cloud (option D). [EAS Workflows syntax](https://docs.expo.dev/eas/workflows/syntax/)
- **Workers:**
  - `linux-medium-nested-virtualization`: 4 vCPU, 16 GiB.
  - `macos-medium`: 5 cores, 20 GiB.
  - `macos-large`: 10 cores, 40 GiB.
  - These are much larger than GitHub's standard runners. [EAS Workflows syntax](https://docs.expo.dev/eas/workflows/syntax/)
- **Build caching / skipping:** a `fingerprint` job feeds `get-build` (reuse a build with a matching `fingerprint_hash`) and `repack` (swap the JS bundle into an existing native build without a native rebuild). This works with CNG, which we use. [EAS Workflows syntax](https://docs.expo.dev/eas/workflows/syntax/), [Expo TesterArmy guide](https://docs.expo.dev/guides/using-testerarmy/) For JS-only PRs, the native build is skipped entirely.
- **Pricing** [expo.dev/pricing](https://expo.dev/pricing):
  - **Plans:**
    - Free: 15 Android + 15 iOS builds/mo, 60 CI/CD min, 1 macOS concurrency, 45-min timeout.
    - Starter: $19/mo + usage, $45 credit.
    - Production: $199/mo, $225 credit.
  - **Builds:** Android $1 (medium) / $2 (large). iOS $2 / $4.
  - **Maestro jobs:** $0.05/job plus CI minutes.
  - **CI minutes:**
    - Linux medium $0.018/min.
    - Linux medium nested-virt $0.020/min.
    - macOS medium $0.075/min.
    - macOS large $0.150/min.
  - **Worked example _(estimate)_:** one PR run covering both platforms with fresh builds and 5-min test jobs costs about $1 + $2 + 2×$0.05 + 5×$0.020 + 5×$0.075, which is roughly **$3.60**. With fingerprint reuse plus repack it costs much less. The Starter credit ($45) covers about 12–15 full dual-platform runs per month.
- **Fit for us:** we already have `eas.json` and EAS builds. Results show up in the Expo dashboard and as a GitHub check.

### D. Maestro Cloud

- **Cloud plan:** **$250 per device per month**, priced by max concurrent executions. It covers hosted Android, iOS, and web devices, unlimited hosted test runs, CI and PR integration, and a free trial. Enterprise pricing is custom. [maestro.dev/pricing](https://maestro.dev/pricing)
- **GitHub Actions integration:** `mobile-dev-inc/action-maestro-cloud@v2.0.2` with `api-key`, `project-id`, and `app-file` (an APK, AAB, or ZIP of `.app`). You still build the app yourself, for example Android on `ubuntu-latest` (cheap) and the iOS simulator `.app` on macOS or EAS. [Maestro Cloud GitHub Actions docs](https://docs.maestro.dev/maestro-cloud/ci-cd-integration/github-actions.md) The EAS `maestro-cloud` job type also works. [EAS Workflows syntax](https://docs.expo.dev/eas/workflows/syntax/)
- **Verdict:** offloads the flaky emulator/simulator part, but $250/mo for one device is steep for a solo/small project.

### E. TesterArmy (hosted) and `tester-army/e2e` (OSS)

- **Hosted platform:**
  - AI agents run natural-language tests on TesterArmy's cloud Android emulators and iOS simulators.
  - Expo's official guide wires it through EAS Workflows: build an APK or simulator `.app` (no AAB/IPA), then `npx testerarmy upload-app`, then `npx testerarmy ci`.
  - It posts a GitHub check and a PR comment. An optional "exploration agent" writes tests from the PR diff.
  - Supports fingerprint/`get-build`/`repack` reuse under CNG.
  - Checks don't block merges by default.
  - Needs `TESTERARMY_API_KEY`, `TESTERARMY_PROJECT_ID`, and `TESTERARMY_GROUP_ID` in the EAS env.
  - [Expo: Using TesterArmy](https://docs.expo.dev/guides/using-testerarmy/)
- **Pricing:**
  - Free: 5 test runs, 1 concurrent.
  - Hobby: $99/mo, 250 runs, 3 concurrent.
  - Startup: $299/mo, 1,000 runs, 10 concurrent.
  - Enterprise: custom.
  - Each run is capped at 20 min of execution. The quota blocks new runs until the 1st of the next month.
  - Build costs (EAS) are on top.
  - [tester.army/pricing](https://tester.army/pricing)
- **OSS `tester-army/e2e`:**
  - Apache-2.0, pre-1.0 ("APIs and config can still change between minor releases").
  - Drives iOS simulators and Android emulators via agent-device, and web via Playwright.
  - Agent steps need a model API key (BYO), but recorded steps replay without model calls until the app changes.
  - Optional hosted device backends: Kernel, Limrun, EAS Simulators, smol machines.
  - A `@e2e-dev/github` reporter posts PR comments. No first-party GitHub Action is documented.
  - So in CI it runs on options A/B (or a hosted backend), with model API cost on top.
  - [tester-army/e2e](https://github.com/tester-army/e2e)
- **EAS Simulator** (a backend option above) is a limited-access preview. It is not included in Free or paid plans and is waitlist-only. [EAS Simulator docs](https://docs.expo.dev/preview/eas-simulator/get-started)

## Framework × runner compatibility

| Runner                        | Maestro                         | Detox                                                | TesterArmy `e2e` OSS                   | TesterArmy hosted         |
| ----------------------------- | ------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------- |
| A. GHA ubuntu + KVM (Android) | Yes                             | Yes (needs a Detox-instrumented debug/release build) | Yes (agent-device + model key)         | n/a                       |
| B. GHA macOS (iOS)            | Yes                             | Yes (needs `applesimutils`)                          | Yes                                    | n/a                       |
| C. EAS Workflows              | **First-class** (`maestro` job) | Custom job only, no pre-packaged job                 | Custom job only                        | Via guide (upload + `ci`) |
| D. Maestro Cloud              | **Only**                        | No                                                   | No                                     | No                        |
| E. TesterArmy hosted          | No                              | No                                                   | Partly (same vendor, separate product) | **Only**                  |

Detox has no managed-cloud or EAS first-class path. Choosing it means options A + B and owning the emulator/simulator plumbing. The Detox rows reflect general Detox requirements and were not re-verified against Detox docs in this pass.

## Takeaways

1. **Cheapest:** **A** for Android (effectively free within the GitHub quota). iOS on **B** costs about $1–2.50/run and burns the included quota fast.
2. **Least setup, both platforms:** **C** (EAS Workflows + Maestro). It reuses our existing `eas.json`. Fingerprint plus repack avoids native rebuilds on JS-only PRs. It costs a few dollars per full run, and Starter ($19/mo) credit covers light usage.
3. **Hosted devices** (D, E) remove emulator flakiness but add $99–$250+/mo. Each one locks you into its framework.
4. **Hybrid worth considering:** Android on A (free) plus iOS on C (EAS macOS, about $2–2.50/run, or less via repack). Or run iOS e2e only on `main`/labelled PRs.
