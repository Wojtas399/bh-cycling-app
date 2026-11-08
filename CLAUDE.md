## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in Wojtas399/bh-cycling-app, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

### E2E tests

The end-to-end suite runs on dedicated simulator and emulator devices against real staging. See `docs/agents/e2e-tests.md` before you run or write one.

## Coding standards

Read `CODING_STANDARDS.md` before writing or reviewing code. It covers testing scope (Jest for business logic, e2e for user-facing flows, no Jest render tests of components or screens) and says ADRs are binding.

## Pull requests

When writing a PR description, use the `/mattpocock-skills:pr` skill and its template (Summary, Evidence, Merge Danger). This replaces any other PR-description skill.

Every PR gets exactly one `type:` label (`type: feature`, `type: bugfix`, `type: chore`, ...), exactly one `size:` label (`size: tiny`, `size: small`, `size: medium`, `size: large`, `size: huge`), at least one `ships:` label (`ships: ota`, `ships: store`, `ships: backend`, `ships: none`), and at least one `area:` label (`area: calendar`, `area: workout`, `area: shared`, ...). See `docs/agents/pr-labels.md`.
