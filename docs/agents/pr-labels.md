# PR Labels

Every pull request gets exactly one `type:` label, exactly one `size:` label, at least one `ships:` label, and at least one `area:` label.

## Type

The `type:` label describes the kind of change. Pick the label for the PR's primary purpose; if a feature PR also touches docs or tests, it is still `type: feature`.

| Label            | Use when the PR...                                     |
| ---------------- | ------------------------------------------------------ |
| `type: feature`  | Adds new user-facing functionality                     |
| `type: bugfix`   | Fixes something that was broken                        |
| `type: refactor` | Restructures code with no behaviour change             |
| `type: chore`    | Updates tooling, dependencies, config, or housekeeping |
| `type: docs`     | Changes documentation only (README, ADRs, CONTEXT.md)  |
| `type: test`     | Adds or changes tests only                             |
| `type: ci`       | Changes CI/CD workflows or the build pipeline          |

Apply it when creating the PR: `gh pr create --label "type: feature" ...`, or afterwards with `gh pr edit <number> --add-label "type: bugfix"`.

## Size

The `size:` label tells a reviewer how much changed, whatever the kind of change. It is a signal only: no size is too big to open or merge.

Size is additions plus deletions across all files, tests included, leaving out generated files (`package-lock.json`, `.idea/`).

| Label          | Changed lines  |
| -------------- | -------------- |
| `size: tiny`   | 10 or fewer    |
| `size: small`  | 11-100         |
| `size: medium` | 101-500        |
| `size: large`  | 501-1000       |
| `size: huge`   | More than 1000 |

Count the lines right after creating the PR, then add the label:

```sh
gh pr view <number> --json files --jq '[.files[] | select(.path | test("(^|/)package-lock\\.json$|^\\.idea/") | not) | .additions + .deletions] | add // 0'
gh pr edit <number> --add-label "size: small"
```

Count again after pushing more commits. If the PR has moved into a different tier, swap the label: `gh pr edit <number> --remove-label "size: small" --add-label "size: medium"`.

## Ships

The `ships:` label tells a reviewer how the change reaches users. It is a signal only: the release flow picks a build or an OTA update by itself.

Add a label for each way the PR ships. A PR that changes both the app and a Cloud Function gets `ships: ota` and `ships: backend`. `ships: none` is always alone.

| Label            | Use when the PR...                                                  |
| ---------------- | ------------------------------------------------------------------- |
| `ships: ota`     | Changes app JS or assets and leaves the native fingerprint the same |
| `ships: store`   | Changes the native fingerprint, so it needs a new build             |
| `ships: backend` | Changes `functions/` or `firestore.rules`                           |
| `ships: none`    | Reaches no user (CI, docs, tests, tooling)                          |

Native config, native dependencies, and app icons change the fingerprint. When unsure, compare the hash on the PR branch with the hash on `main`, with dependencies installed on each. A different hash means `ships: store`, which replaces `ships: ota`.

```sh
npx @expo/fingerprint . | jq -r .hash
```

Check again after pushing more commits.

## Area

The `area:` label tells a reviewer which part of the app changed. Add a label for each area with a change a user or maintainer would notice, not for every folder the diff touches. A shared helper edited for one screen takes that screen's label.

| Label             | Use when the PR changes...                                  |
| ----------------- | ----------------------------------------------------------- |
| `area: home`      | The Home screen                                             |
| `area: calendar`  | The Calendar screen or its day sheet                        |
| `area: workout`   | Workout Details, Workout tiles, or the Workout Profile      |
| `area: activity`  | Activity Details or Unplanned Activities                    |
| `area: notes`     | Notes                                                       |
| `area: settings`  | Settings, password change, or account deletion              |
| `area: auth`      | Sign-in, sign-up, password reset, or email verification     |
| `area: intervals` | The Intervals.icu connection, API, or token functions       |
| `area: shared`    | App-wide behaviour: navigation, i18n, theme, the app icon   |
| `area: tooling`   | CI, release, scripts, agent setup, or project documentation |
