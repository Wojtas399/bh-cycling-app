## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in Wojtas399/bh-cycling-app, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

## Coding standards

Read `CODING_STANDARDS.md` before writing or reviewing code. It covers testing scope (business logic only, no UI tests) and says ADRs are binding.

## Pull requests

When writing a PR description, use the `/mattpocock-skills:pr` skill and its template (Summary, Evidence, Merge Danger). This replaces any other PR-description skill.

Every PR gets exactly one `type:` label (`type: feature`, `type: bugfix`, `type: chore`, ...). See `docs/agents/pr-labels.md`.
