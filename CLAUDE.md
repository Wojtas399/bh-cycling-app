## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in Wojtas399/bh-cycling-app, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

### E2E tests

The end-to-end suite runs against real staging, started by hand from the dev's machine, on dedicated simulator and emulator devices or on Expo Simulators. See `docs/agents/e2e-tests.md` before you run or write one.

## Coding standards

Read `CODING_STANDARDS.md` before writing or reviewing code. It covers testing scope (Jest for business logic, e2e for user-facing flows, no Jest render tests of components or screens) and says ADRs are binding.

## Subagents

Before you delegate a spec's tickets to implementer subagents, read `docs/agents/delegation.md`.

## Probes

Probe a lint rule without a file: `npx eslint --stdin --stdin-filename lib/probe.ts`. Put a type-check probe in the gitignored `.scratch/` folder, which `tsc` still checks, never in `lib/` or another source folder.

## Pull requests

When writing a PR description, use the `/mattpocock-skills:pr` skill and its template (Summary, Evidence, Merge Danger). This replaces any other PR-description skill.

Every PR gets exactly one `type:` label (`type: feature`, `type: bugfix`, `type: chore`, ...), exactly one `size:` label (`size: tiny`, `size: small`, `size: medium`, `size: large`, `size: huge`), at least one `ships:` label (`ships: ota`, `ships: store`, `ships: backend`, `ships: none`), and at least one `area:` label (`area: calendar`, `area: workout`, `area: shared`, ...). See `docs/agents/pr-labels.md`.

To land or fix a stack of PRs, see `docs/agents/stacked-prs.md`.

Pick the base branch by the `ships:` label. A PR that ships (`ships: ota`, `ships: store`, `ships: backend`) targets the open release branch (`git branch -r --list 'origin/rc/*'`), or `main` when none is open. A `ships: none` PR targets `main`. Diff and review against `origin/<base>`, since local branches lag behind.

## The `main` branch

Remote `main` changes only through merged PRs. The husky `pre-push` hook rejects any push that updates `main` on the remote: fast-forwards, force pushes and deletes. Never bypass it: don't set `ALLOW_MAIN_PUSH=1` and don't pass `--no-verify`. Those overrides are for the repo owner only.

The hook can't see commits made in the GitHub web editor, ref updates through `gh api`, or pushes from a clone without husky installed. Server-side protection would close these gaps, but it needs GitHub Pro on this private repo.
