# EAS Workflows capabilities for this repo

Research for #347, part of map #346 (CI on EAS Workflows with e2e on Expo Simulators). Gathered 2026-11-11.

Expo now brands the product "Expo Workflows" in the docs and "CI/CD Workflows" on the pricing page. The CLI commands and files still use `eas` (`eas workflow:run`, `.eas/workflows/*.yml`).

## Sources

Primary sources only. Docs were read from the source of docs.expo.dev in `expo/expo` (`docs/pages/...`, `main` branch, fetched 2026-11-11). The paths below map to `https://docs.expo.dev/<path>/`.

- [S1] Workflow syntax: `eas/workflows/syntax`
- [S2] Pre-packaged jobs: `eas/workflows/pre-packaged-jobs`
- [S3] Environment variables in workflows: `eas/workflows/environment`
- [S4] Manage workflow runs: `eas/workflows/manage-workflow-runs`
- [S5] Limitations: `eas/workflows/limitations`
- [S6] Deploy to production example: `eas/workflows/examples/deploy-to-production`
- [S7] Expo Services environment variables: `eas/environment-variables` (index, manage, usage)
- [S8] Infrastructure (images, workers, npm cache): `build-reference/infrastructure`, `build-reference/caching`
- [S9] Pricing: https://expo.dev/pricing (read 2026-11-11), and `billing/plans`
- [S10] Expo Simulators: `preview/simulators/reference/usage-and-billing`, `preview/simulators/how-to/run-in-ci`
- [S11] Agentic workflows: `agentic-workflows/agentic-ci`, `agentic-workflows/setup`
- [S12] Workflow JSON schema: https://api.expo.dev/v2/workflows/schema
- [S13] Observed GitHub data: commit statuses that `expo[bot]` posted on `expo/expo` commits (for example `67356434c115436edc1abde518160cc0d67941fc`), from `gh api repos/expo/expo/commits/<sha>/statuses` and `/check-runs`. Expo's own workflow files are in `expo/expo/apps/expo-workflow-testing/.eas/workflows/`.
- [S14] GitHub docs: "Available rules for rulesets" and "About rulesets".

Repo context: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/release.sh`, `eas.json`.

## Short answer

- **Triggers:** every trigger we need exists. That covers PRs filtered by base branch, pushes to `rc/*`, `hotfix/*` and `main`, `v*` tags, and manual runs from `eas workflow:run`. A head-branch filter such as `rc/*` is a trigger-level `if:` on `github.event.pull_request.head.ref`. I found no documented "Run workflow" button on the dashboard.
- **GitHub reporting:** runs that a GitHub event starts post one **commit status per job** (statuses, not check runs). The status context is `<workflow name> / <job name> (@<account>/<project slug>)`. GitHub rulesets accept commit statuses as required checks. So yes, a ruleset can require them, with caveats (see below). Runs started with `eas workflow:run` post no status.
- **Generic Linux jobs:** custom jobs on `linux-medium` with `eas/checkout` and `eas/install_node_modules`, then `run:` steps. `defaults.tools.node` pins Node. Expo runs an npm cache server, and `eas/restore_cache` / `eas/save_cache` are available too.
- **Secrets:** Expo Services environment variables. Visibility is plain text, sensitive or secret, and file variables are supported. A job reads the variables of its `environment` as `$VAR` or `${{ env.VAR }}`.
- **Control flow:** `needs`, `after` and `if` set the order. Jobs with no `needs` run in parallel. `concurrency` works per workflow run, with queueing. `set-output` passes outputs, and `eas/upload_artifact` / `eas/download_artifact` pass artifacts. **There is no matrix.**
- **Release flow:** `build`, `submit`, `update`, `fingerprint` and `get-build` jobs cover most of `release.sh`. The ref routing and version handling need a custom "route" job. Some steps still need verification (listed below).
- **Plans:**

  |                 | Free                              | Starter                                          |
  | --------------- | --------------------------------- | ------------------------------------------------ |
  | Price           | $0                                | $19/month                                        |
  | CI/CD minutes   | 60 minutes, no overage            | Billed per minute ($0.018/min on `linux-medium`) |
  | Builds          | 15 Android + 15 iOS, low priority | $45 credit, then $1–$4 per build                 |
  | Concurrency     | 5 jobs, 1 on macOS                | 5 jobs, 2 on macOS                               |
  | Expo Simulators | "Coming soon"                     | $0.10/min, 60 min/month included until 2027      |

## 1. GitHub triggers

All need the Expo project linked to the GitHub repo through the Expo GitHub app (project settings → GitHub) [S1, `get-started`].

| Need                               | Syntax                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR to `main`                       | `on.pull_request.branches: [main]`                                                                                  | `branches` matches the **base** branch. Default `types` are `opened`, `reopened`, `synchronize`. Also available: `edited`, `base_ref_changed`, `ready_for_review`, `labeled`. `paths` filter and `!` negation are supported [S1].                                                                                                                                                                                                                                                                                                                                                                        |
| PR **from** `rc/*`                 | `on.pull_request.if: ${{ startsWith(github.event.pull_request.head.ref, 'rc/') }}`                                  | There is no head-branch filter key, so a trigger-level `if` (at most 250 chars) does it. When it is false, no run is created [S1]. Expo uses the same pattern in `expo/expo` (`updates-e2e-cli.yml` filters on `github.event.pull_request.head.ref`) [S13]. `github.event` is the full GitHub webhook payload, so `pull_request.head.ref` and `base.ref` are available [S3].                                                                                                                                                                                                                             |
| Push to `rc/*`, `hotfix/*`, `main` | `on.push.branches: [main, 'rc/*', 'hotfix/*']`                                                                      | Globs and `!` negation are supported [S1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Tags `v*`                          | `on.push.tags: ['v*']`                                                                                              | If only `tags` is set, `branches` defaults to `[]`. Set both lists when both are needed. `github.ref_type` is `tag` [S1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Manual                             | `eas workflow:run .eas/workflows/x.yml [-F key=value]`                                                              | **Any** workflow can be run manually, whatever its `on` is. `on.workflow_dispatch.inputs` defines typed inputs (`string`, `boolean`, `number`, `choice`, `environment`). The REST API can start runs too [S1]. By default the CLI uploads the local working tree. `--git-branch` plus `--git-commit-hash` labels the run with a pushed commit, but the run still uses the uploaded files, and **no commit status is posted** [S4]. **Unverified:** a "run workflow" button on the expo.dev dashboard. The docs mention only CLI and REST for starting runs, and the dashboard only for **re-runs** [S4]. |
| Other                              | `pull_request_labeled`, `pull_request_comment`, `ref_delete`, `schedule.cron`, `app_store_connect`, `workflow_call` | `schedule` is **paid plans only** and runs only from the default branch [S1].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Other facts:

- Commit messages with `[eas skip]`, `[skip eas]` or `[no eas]` skip `push` and `pull_request` runs [S1].
- PRs from **forks** do not trigger `pull_request` runs [S1]. That matters once the repo is public.
- A `pull_request` run uses the workflow files **and code of the PR head**, not the base [S1]. So whoever can push a branch can change the workflow and read the secrets of the job's environment [S11, setup "What the agent can do"].

## 2. How results reach GitHub

- **Commit statuses, one per job.** Observed on `expo/expo` [S13]. Statuses are created by `expo[bot]`, and the `check-runs` endpoint shows no Expo check runs. Example contexts:
  - `E2E Test Suite for Expo Brownfield / Compilation Test (iOS) (@expo-ci/expo-workflow-testing)`
  - `TV compile test / ios (@expo-ci/expo-workflow-testing)`

  The format is `<workflow name> / <job name or id> (@<account>/<project slug>)`. For this repo, a job would read `<Workflow> / <Job> (@wojtas/black-horse-cycling-app)`, assuming the project slug from `app.config.ts`. That expected context is an inference from the observed pattern.

- **Status states and descriptions (observed):**
  - `pending` "Job is waiting to start." / "Job is running."
  - `success` "Job has succeeded."
  - `error` "Job has errored."
  - **`success` "Job has been skipped."** for a job skipped by `if`.
- **Concurrency states (documented):** a queued run's status reads "Workflow run is waiting for another run in its concurrency group." A run canceled by concurrency shows as canceled without the reason [S1].
- **Not documented in the docs.** The docs never describe the status context format or that each job gets its own status. Everything above comes from observation [S13]. Expo could change it without notice.
- **Runs from `eas workflow:run`** post no commit status [S4].
- **PR comments:** a `github-comment` pre-packaged job exists [S1].

### Can a ruleset require them?

GitHub says "Required status checks can be checks or statuses", and a rule can pin the expected source app [S14]. So the per-job EAS statuses can be required by exact context name. Pinning the source to the Expo app should be possible because `expo[bot]` writes the statuses, but I did not try it. Caveats:

1. **The context includes the workflow name, the job name and the project slug.** Renaming any of them breaks the required check.
2. **Required checks need a run to happen.** If the workflow is not triggered because of a `paths` filter, a trigger `if` or `[eas skip]`, no status appears and the PR stays blocked. Required PR-check workflows should not use `paths` or a trigger `if`. Use job-level `if`, because a job skipped by `if` reports `success` [S13].
3. **A skipped job reports `success`.** A required job that is skipped by its own `if`, or by a failed `needs` (a downstream job skips when an upstream job fails [S1]), could therefore look green. **Unverified:** whether a job blocked by a failed `needs` reports `success`/skipped or stays absent. The `expo/expo` sample only showed `if`-skipped jobs. Require the jobs that do the work, not downstream ones.
4. **Plan gate (GitHub):** rulesets on a private repo need GitHub Pro/Team. The map notes the repo goes public first. The "About rulesets" page fetched here names only Team/Enterprise for its feature. I did not re-read the availability note that covers public repos on GitHub Free.

## 3. Generic Linux jobs for npm scripts

A custom job is a job without `type`, made of `steps` [S1]:

```yaml
jobs:
  lint:
    name: Lint
    runs_on: linux-medium # default; 4 vCPU / 16 GiB
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules # detects npm; runs the immutable install (npm ci)
      - run: npm run lint
      - run: npx prettier --check .
```

- **Workers [S1]:**
  - `linux-medium` (default) and `linux-large`
  - `linux-*-nested-virtualization`, needed for Android Emulators
  - `macos-medium` / `macos-large`, needed for iOS Simulators and iOS builds
- **Node version [S1, S8]:**
  - `defaults.tools.node` sets the version for the whole workflow. It is installed with `nvm`, so `'20'` or `latest` work.
  - `defaults.image` / `jobs.<id>.image` picks the VM image (`auto` by default, `sdk-XX` recommended). Each image ships one Node version: current images have Node 22.x, older ones 20.19.x.
  - Today `ci.yml` uses Node 20 and `release.yml` uses Node 22. No `.nvmrc` or `engines` in the repo pins it.
- **npm cache [S8]:**
  - Expo Build runs an npm cache server, and images point the global `~/.npmrc` at it. The caching doc describes it for "build jobs". I assume it applies to custom jobs on the same images, but did not verify that.
  - Explicit caching: `eas/restore_cache` / `eas/save_cache` with `key: npm-${{ hashFiles('package-lock.json') }}` and `path: ~/.npm`. `hashFiles()` works only in steps.
  - Installs use `npm ci` by default (`EAS_NO_FROZEN_LOCKFILE=1` turns that off).
- **Steps:** each has `run`, `shell`, `working_directory`, `id` and `name`. A job-level `env` is supported [S1].
- **Cost:** each custom job bills per minute (see §7), including the `npm ci` time. Three parallel jobs (lint, typecheck, test) run `npm ci` three times. One job with three steps runs it once but is not fail-fast per check.

## 4. Secrets and environment variables

- **Environments.** Expo Services variables belong to `development`, `preview` or `production`. Custom environment names need the Production or Enterprise plan, not Starter [S7].
- **Scope.** Variables are project-wide or account-wide [S7].
- **Visibility [S7]:**
  - **Plain text:** visible on the website, in the CLI and in logs.
  - **Sensitive:** hidden in Build and Workflows logs, but readable in the CLI and revealable on the website.
  - **Secret:** never readable outside Expo servers, and hidden in logs.

  `eas env:pull` skips secret variables. `release.sh` already relies on that.

- **File variables.** An uploaded file (for example `GOOGLE_SERVICES_JSON`) shows up in a job as a file path on the runner [S7]. Today `release.sh` runs `eas env:pull` because `eas build` ignores file variables outside EAS servers. In Workflows, build, update and fingerprint jobs run on EAS workers, so file variables should resolve there without that workaround. I infer this from [S7]; it is not tested.
- **How jobs read them [S3]:**
  - A job sees only the variables of its `environment`:
    - `build` takes it from the profile's `environment` in `eas.json`.
    - `submit` inherits it from the build.
    - `maestro` and `maestro-cloud` default to `preview`.
    - **every other job, custom jobs included, defaults to `production`.** Set `environment:` explicitly.
  - Read them as `$VAR` in `run`, or as `${{ env.VAR }}` in `params`, `if`, `env` and `run`.
  - Precedence: job `env`, then the `eas.json` profile `env` (build jobs only), then Expo Services variables.
  - Secret and sensitive values are redacted in logs.
  - `set-env` passes a value to later steps of the same job.
- **This repo:** the `dev`/`staging` profiles use `environment: development`. `production` does not set it (§6 covers that). `preview` and `dev-client` have no `environment`. A `CLAUDE_CODE_OAUTH_TOKEN` secret would sit in whichever environment the e2e job uses, and every job of that environment can read it.
- **`EXPO_TOKEN` in custom jobs.** Expo's own agentic-CI workflow runs `env -u EXPO_TOKEN ...`, which means custom jobs get an `EXPO_TOKEN` injected [S11]. Expo's simulator scripts still use a separate robot token (`EXPO_TOKEN_SIMULATOR`, Developer role), stored as a variable. **Unverified:** what the injected token may do, for example `eas account:usage`, `eas build:list` or `simulator:start`. Plan for a robot-user token stored as a secret variable [S10, S11].

## 5. Concurrency, dependencies, parallelism, artifacts

- **Dependencies [S1]:**
  - `needs: [a]` runs after `a` succeeds. If `a` is skipped, the job does not run.
  - `after: [a]` runs after `a` whatever its result.
  - `if:` takes expressions with `success()`, `failure()` and `always()`. `needs.<id>.status` and `needs.<id>.outputs` are available.
- **Parallelism.** Jobs without `needs` or `after` run in parallel, limited by account concurrency (5 jobs, of which 1 on macOS on Free and 2 on Starter) [S9].
- **No matrix** [S5]. Write one job per platform, or a reusable workflow (`on.workflow_call` with `inputs`) called twice with `uses:` / `with:` [S1].
- **Concurrency is per workflow run only.** It is top-level, not per job [S1].
  - `group` is a template evaluated when the run is created. Groups are shared across all workflow files of the project.
  - `cancel_in_progress` is a boolean or an expression.
  - `queue: single` (default): only the newest waiting run is kept. This matches GitHub's pending-run behavior.
  - `queue: max`: up to 100 runs wait in FIFO order. It cannot be combined with `cancel_in_progress: true`.
  - A waiting run uses no minutes. A run waiting on `require-approval` holds its group.
  - **For the e2e queue:** `group: e2e` with `queue: max` (or `single`) serializes e2e runs across PRs and manual runs.
- **Outputs [S1].** `set-output name value` in a step, `outputs:` on the job, read downstream as `needs.<id>.outputs.<name>`. A called workflow's outputs go through `on.workflow_call.outputs`.
- **Artifacts [S1].**
  - `eas/upload_artifact` with `type: other`, `name`, `path` (globs), and `if: ${{ always() }}` to keep reports from failed steps.
  - `eas/download_artifact` takes a `name` or `artifact_id`.
  - Artifacts show in the run's Artifacts section. I found no documented retention period.
- **Retries and timeouts.** The schema has no generic job `retries`, `timeout` or `continue_on_error`. Only `maestro`/`maestro-cloud` have `retries` [S12]. "Re-run from failed jobs" exists on the dashboard only [S4]. A flake policy for the e2e workflow has to be scripted inside the job.

## 6. Built-in job types and how `release.yml` maps

### Job types [S2]

- **`build`**
  - Params: `platform`, `profile` (defaults to `production`), `message`.
  - Hooks: `before_install_node_modules` / `after_install_node_modules`.
  - Outputs: `build_id`, `app_version`, `channel`, `fingerprint_hash`, `git_commit_hash`, and more.
  - The workflow waits for the build. There is no auto-submit param; submitting is a separate job.
- **`submit`**
  - Params: `build_id` (required), `profile` (submit profile, defaults to `production`).
  - Hooks: `before_submit` / `after_submit`.
- **`update`**
  - Params: `channel` or `branch`, `platform`, `message` (defaults to the commit message), `rollout_percentage`.
  - Job-level `environment` is needed. Hooks include `after_checkout` and `before_update`.
- **`fingerprint`**
  - Takes `environment` and `env`, **but not a build profile**. Outputs `android_fingerprint_hash` and `ios_fingerprint_hash`.
  - CNG-only, which fits: the repo has no `android/` or `ios/`.
- **`get-build`**
  - Filters by `platform`, `profile`, `channel`, `app_version`, `fingerprint_hash`, `distribution`, `simulator`, and more.
  - `wait_for_in_progress` waits for a matching running build.
  - Returns an empty `build_id` when nothing matches.
- **Others:** `repack`, `testflight`, `update-rollout`, `require-approval`, `slack`, `email`, `github-comment`, `maestro`, `maestro-cloud`, `branch-delete`, `deploy`, `doc`.

Expo's "Deploy to production" example shows the fingerprint → get-build → build+submit **or** update pattern [S6]. That is what `release.sh` does by hand.

### Step-by-step mapping

| `release.yml` / `release.sh`                                                                                             | EAS Workflows equivalent                                                                                                                                                                                                                                                                                                                                     | Status                            |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `on.push` branches `main`, `rc/*`, `hotfix/*`; tags `v*`                                                                 | Same keys in `on.push`                                                                                                                                                                                                                                                                                                                                       | Direct                            |
| `checks: uses: ./.github/workflows/ci.yml`                                                                               | `on.workflow_call` in a CI workflow, called with `uses:` from the release workflow; release jobs `needs` it                                                                                                                                                                                                                                                  | Direct [S1]                       |
| `matrix: [ios, android]`, `fail-fast: false`                                                                             | One job per platform (no matrix). They are independent unless joined by `needs`                                                                                                                                                                                                                                                                              | Workaround [S5]                   |
| `concurrency: release-<ref>-<platform>`, no cancel                                                                       | Top-level `concurrency: group: release-${{ github.ref_name }}`. **Per-platform groups are not possible**, so one group covers both platforms of a ref                                                                                                                                                                                                        | Coarser                           |
| Routing by regex on `GITHUB_REF_TYPE:GITHUB_REF_NAME` (`main`, `rc/X.Y.Z`, `hotfix/vX.Y.Z`, `vX.Y.Z`, `vX.Y.Z-hotfix-N`) | Expressions have `startsWith`, `endsWith`, `contains` and `substring`, but **no regex**. Keep a custom **route job** that runs the bash checks and `set-output`s `target`, `version`, `mode` (build/update), and so on. Later jobs then key on `needs.route.outputs.*`                                                                                       | Custom job                        |
| `use_target`: profile/channel/`APP_ENV` + `eas env:pull`                                                                 | `build` takes `profile`, and the profile carries `environment` and `env.APP_ENV`. `update` and `fingerprint` take `environment` plus `env: { APP_ENV: ... }`. `env:pull` should be unnecessary on EAS workers (§4)                                                                                                                                           | Direct; env:pull removal untested |
| `config_version` / `require_config_version` (rc branch must equal `app.config.ts` version)                               | In the route job: `eas/checkout`, then the same `sed` check, failing the job                                                                                                                                                                                                                                                                                 | Custom job                        |
| `set_version` (edit `app.config.ts` in the working tree; EAS uploads it)                                                 | Each job checks out the commit again, so the edit has to be **repeated in every job that reads the config**. Use the `build` hook `before_install_node_modules` and the `update`/`fingerprint` hook `after_checkout`. **Unverified:** that a build-hook edit reaches the native build's app config. It runs on the build worker before install, so it should | Hooks; verify                     |
| `fingerprint` with `--build-profile`                                                                                     | `fingerprint` job with `environment` set to the profile's environment and `env: APP_ENV` set to match. The job has no profile param, so profile `env` must be repeated. Verify the hashes against `eas fingerprint:generate --build-profile` (the repo has a `fingerprint.config.js`)                                                                        | Verify parity                     |
| `has_matching_build` (`build:list` by platform, channel, app version, fingerprint; status not ERRORED/CANCELED)          | `get-build` with `platform`, `channel`, `app_version`, `fingerprint_hash`, `wait_for_in_progress: true`. The script counts in-progress builds as a match right away. `get-build` waits for them, and treats a failed one as "no match"                                                                                                                       | Close; semantics differ           |
| `build --no-wait --auto-submit` (staging, production)                                                                    | `build` job, then `submit` job with `build_id` and `profile: staging`/`production`. The workflow **waits** for the build, so a failed store build turns the run red, unlike today                                                                                                                                                                            | Direct; behavior changes          |
| Dev build waits, never submitted                                                                                         | `build` with `profile: dev`, no submit job                                                                                                                                                                                                                                                                                                                   | Direct                            |
| `dev_build_fits_quota` (`eas account:usage` JSON, keep 3 spare builds)                                                   | Custom job running `npx eas-cli@latest account:usage wojtas --json` + `jq`, then `set-output fits`. Needs a usable token (§4). The `build` job's `if:` reads the output                                                                                                                                                                                      | Custom job; token unverified      |
| `skip_dev_build` → `::warning::` + `GITHUB_STEP_SUMMARY`                                                                 | No step-summary equivalent documented. Echo to the log, or add a `slack`/`email` job. PR context is missing on push runs, so `github-comment` does not fit                                                                                                                                                                                                   | Lost / replace                    |
| `update --channel --platform --environment --message "<ref>: <subject>"`                                                 | `update` job: `channel`, `platform`, `environment` (job-level), `message: '${{ github.ref_name }}: ${{ github.commit_message }}'` (`commit_message` exists for push events)                                                                                                                                                                                  | Direct                            |
| Production hotfix `--rollout-percentage 0`                                                                               | `update` param `rollout_percentage: 0`                                                                                                                                                                                                                                                                                                                       | Direct                            |
| `require_commit_on` (`git merge-base --is-ancestor HEAD origin/rc/X`)                                                    | `eas/checkout` is a **shallow fetch (`--depth 1`)** [S1]. The route job would need `git fetch --unshallow origin rc/X` or the GitHub compare API. **Unverified:** that the job can fetch more history from the private repo                                                                                                                                  | Open risk                         |
| `expo/expo-github-action` + `EXPO_TOKEN` secret                                                                          | Not needed for pre-packaged jobs. Custom jobs that call `eas` need a token (§4)                                                                                                                                                                                                                                                                              | —                                 |

Notes for the `production` profile:

- **Environment.** The profile has no `environment`. On EAS Build the default is then chosen automatically (production for store builds). `release.sh` passes `--environment production` explicitly to `env:pull` and `update`. **Unverified for Workflows:** whether the build job infers `production` when the profile has no `environment`. Adding `"environment": "production"` to the profile makes this explicit.
- **Store credentials.** The `submit` job uses the same store credentials as `eas submit` today, either Expo-managed or set in the submit profile. Staging iOS already has `ascAppId`.

## 7. Plans and pricing (Free vs Starter)

From expo.dev/pricing, read 2026-11-11 [S9]. "Beta pricing. Rates may change at general availability" applies to Simulators.

|                                 | Free                                                                                                                             | Starter                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Price                           | $0/month                                                                                                                         | $19/month plus usage                                                                                                                                               |
| Builds                          | Up to 15 Android + 15 iOS builds/month, **low priority**, 45-min timeout                                                         | **$45 build credit**/month, then flat per-build pricing, **high priority**, 2-hour timeout                                                                         |
| Per-build rates (beyond credit) | — (no overage on Free)                                                                                                           | Android medium $1, large $2; iOS medium $2, large $4                                                                                                               |
| Concurrency                     | 5 jobs, up to 1 on macOS                                                                                                         | 5 jobs, up to 2 on macOS (+$50 per extra, up to 5 extra)                                                                                                           |
| CI/CD (non-build job) minutes   | **"Up to 60 minutes"** ("60 min. on CI/CD Workflows"). The page does not say "per month"; resets are monthly per `billing/plans` | Usage-based: linux-medium $0.018/min, linux-medium nested-virt $0.020, linux-large $0.035, linux-large nested-virt $0.040, macos-medium $0.075, macos-large $0.150 |
| Build jobs inside workflows     | "Use included builds"                                                                                                            | "Use included build credits, then usage-based pricing"                                                                                                             |
| Update, submit, custom jobs     | Included (✓)                                                                                                                     | Included (✓)                                                                                                                                                       |
| Maestro e2e job                 | —                                                                                                                                | $0.05 + CI/CD minutes                                                                                                                                              |
| Expo Simulators minutes         | "Coming soon"                                                                                                                    | **Usage-based: $0.10/min iOS Simulator or Android Emulator, "60 min/month included until 2027"**; max session 115 min                                              |
| Expo Update                     | 1,000 MAU                                                                                                                        | 3,000 MAU, then usage-based                                                                                                                                        |
| Scheduled (cron) workflows      | Not available                                                                                                                    | Available (paid plans) [S1]                                                                                                                                        |

Other facts:

- "Build jobs within workflows are billed using the same flat-rate pricing as standalone Expo Build jobs." "Jobs other than build jobs are billed at per-minute pricing." [S9]
- Free accounts cannot incur overage charges [S9, `billing/plans`]. What happens to workflow jobs once the 60 Free minutes run out is **not documented** in the pages read. Presumably they are blocked until the period resets.
- **Expo Simulators access is per account, not per plan.** Every Simulators doc page says "limited-access preview … not included with paid or free plans … select partners" [S10, S11]. The pricing page lists Starter rates anyway. The map says this account (`wojtas`) already has access.
- **Simulator session limits [S10].**
  - Maximum session length is **40 min on Free** and 115 min on paid plans.
  - Sessions use the account's job concurrency and queue when none is free.
  - Queue time does not count toward the 15-minute startup timeout.
  - A CI job that ends does **not** stop its session. Always set `--max-duration-minutes` and stop the session in a cleanup step.
- **Rough per-run costs on Starter (my arithmetic from [S9] rates).**
  - **PR checks:** three `linux-medium` jobs of about 3 min each cost about 9 × $0.018 ≈ $0.16 per push. On Free, 60 min covers roughly 6–7 such pushes a month, after which the checks stop running.
  - **e2e run, builds:** a fresh iOS Simulator build ($2) and Android build ($1) cost $3, paid from the $45 credit first.
  - **e2e run, simulator minutes:** two sessions of about 15 min each use 30 min (half the included 60 min/month), then $0.10/min.
  - **e2e run, CI minutes:** the job that drives the session also bills per minute.
  - Today's dev builds on every `main` push also draw from the same build credit.

## Open questions and things to verify by trial

1. Job status for a job skipped because a `needs` dependency failed: does it post `success` (skipped), `error`, or nothing? This decides which jobs are safe to make required.
2. Whether the GitHub ruleset UI can pin the source to the Expo GitHub app for these statuses.
3. What the auto-injected `EXPO_TOKEN` in custom jobs can do. Can it run `account:usage`, `build:list` and `simulator:*`, or is a robot token needed?
4. Whether the build-hook `sed` of `app.config.ts` takes effect in the native build, and whether `fingerprint` job hashes equal `eas fingerprint:generate --build-profile <p>` hashes.
5. Whether the route job can deepen the shallow clone (`git fetch --unshallow`) against the private repo.
6. Whether custom jobs use the npm cache server, and the actual `npm ci` time on `linux-medium`.
7. What happens when the Free plan's 60 CI minutes run out.
8. Whether there is a dashboard button to start a run. Only CLI and REST are documented.
9. How long uploaded artifacts are kept.
