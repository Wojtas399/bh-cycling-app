# PR Type Labels

Every pull request gets exactly one `type:` label describing the kind of change. Pick the label for the PR's primary purpose; if a feature PR also touches docs or tests, it is still `type: feature`.

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
