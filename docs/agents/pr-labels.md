# PR Labels

Every pull request gets exactly one `type:` label and exactly one `size:` label.

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
