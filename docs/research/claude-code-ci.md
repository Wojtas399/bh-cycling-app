# Claude Code headless in CI for e2e agent steps

Research for #349 (map #346), 2026-11-11. Can the e2e agent steps run on Claude Code in CI, on the owner's subscription through `CLAUDE_CODE_OAUTH_TOKEN`, instead of a billed API key?

**Short answer: yes, from the source and the docs. Nothing has been run on a runner yet.** `claudeCode()` passes the CI environment through to Zed's adapter. The adapter runs the Claude CLI that ships inside the Agent SDK's platform package, and that CLI reads `CLAUDE_CODE_OAUTH_TOKEN`. A run whose agent steps all replay from the cache never starts Claude Code, so it needs no token. Today it doesn't matter: no committed test has an agent step (no `agent.act`, `agent.assert`, `agent.waitFor` or `agent.extract` under `e2e/`), so the suite makes no model call and the replay cache stays empty.

Versions read: e2e 0.23.0, @e2e-dev/acp 0.1.1, @agentclientprotocol/claude-agent-acp 0.101.0 (latest is 0.106.0), and @anthropic-ai/claude-agent-sdk 0.3.318, from the installed `node_modules` and the docs that ship in the `e2e` package (`node_modules/e2e/docs/`). The live https://e2e.com/docs/cache page matches the shipped `cache.mdx`.

## 1. Does `claudeCode()` authenticate from `CLAUDE_CODE_OAUTH_TOKEN` on a headless Linux runner?

**Yes. The code supports it, but no Linux run has proved it.**

The chain, from the source:

1. `claudeCode()` launches `process.execPath` (the Node running e2e) with the adapter's `claude-agent-acp` bin. It finds the adapter in `node_modules` from the working directory up and never downloads it. Its env is `{ ANTHROPIC_MODEL: model, ...options.env }`. It doesn't pass `--hide-claude-auth`, the adapter flag that refuses subscription logins (`@e2e-dev/acp/dist/presets.js`, `claudeCodeLaunch`).
2. The agent process gets `withoutSecrets({ ...process.env, ...launch.env })`. That is the runner's whole environment minus names that match `/^E2E_(?:SECRET|USER)_/i` (`@e2e-dev/acp/dist/session.js`). So `CLAUDE_CODE_OAUTH_TOKEN` reaches the agent.
3. The adapter runs the Claude CLI binary from `CLAUDE_CODE_EXECUTABLE` if it's set. Otherwise it uses the Agent SDK's platform package, `@anthropic-ai/claude-agent-sdk-linux-<arch>` (or `-musl`, picked by libc) (`claude-agent-acp/dist/claude-cli.js`). The adapter reads `CLAUDE_CODE_OAUTH_TOKEN` as a credential source and as part of its provider routing key (`claude-agent-acp/dist/acp-agent.js`, `PROVIDER_ROUTING_ENV_VARS`; `auth-status.js` names it as a CLI `tokenSource`).
4. The CLI picks `CLAUDE_CODE_OAUTH_TOKEN` at rank 5 of its credential order. It's below cloud providers, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY` and `apiKeyHelper`, and above a stored `/login`. The docs call it the method "for CI pipelines and scripts where browser login isn't available" ([Authentication, precedence](https://code.claude.com/docs/en/authentication#authentication-precedence)). **So the runner must not also set `ANTHROPIC_API_KEY`.** If both are set, the key wins and the run is billed through the API.
5. The preset sets `settingSources: []`, so the CLI reads no user or project settings. That's fine, because the token comes from the env and not from settings. Only bare mode (`--bare`) ignores the token ([Generate a long-lived token](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)). The adapter's dist never passes `--bare`.

What must be installed:

- **No separate `claude` CLI.** The binary comes in through the optional dependencies of `@anthropic-ai/claude-agent-sdk` 0.3.318: linux x64 and arm64, glibc and musl, darwin, and win32. `package-lock.json` already pins the linux-x64 and linux-arm64 entries, so `npm ci` on a Linux runner installs them. Don't install with `--omit=optional`, or the adapter fails with "Claude native binary not found". `CLAUDE_CODE_EXECUTABLE` can point at a CLI that's already installed.
- **Node:** `e2e`, `@e2e-dev/mobile` and `@e2e-dev/acp` require `^22.22.3 || >=24.8.0`. The adapter requires `>=22` and the SDK `>=18.14`. `docs/e2e.md` already asks for 24.8+.
- **The adapter package installed in the project.** `claudeCodeLaunch` resolves its bin when the config module calls `claudeCode()`, so without it the config doesn't load (`INVALID_CONFIG`). It's already a devDependency.
- **Generating the token:** `claude setup-token` makes a **one-year** token tied to the subscription, which needs Pro, Max, Ultra, Team or Enterprise. "It can only make model requests" ([Authentication](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)). The command prints the token and saves it nowhere. Storing it as an EAS secret is a HITL step.

Not verified: an actual ACP session on a Linux EAS worker. Also unchecked: whether the CLI wants a writable `~/.claude` or anything else on a clean home. GitHub Actions runs the same CLI on clean runners with this token ([GitHub Actions](https://code.claude.com/docs/en/github-actions)), so that's likely fine, but the first CI run is the proof. The adapter's model check is a separate risk: `claudeCode({ model: 'sonnet' })` fails with `INVALID_CONFIG` if the session doesn't offer `sonnet` (`session.js`), and that depends on what the token's plan serves.

Side effect worth knowing: every env var except `E2E_SECRET_*`/`E2E_USER_*` reaches the agent process, including `E2E_INTERVALS_API_KEY` and any EAS secret. The e2e docs warn about this ([subscriptions.mdx, Secrets](https://e2e.com/docs/subscriptions#use-your-coding-agent)). The agent gets no file, shell or network tools, so the risk is small, but a CI job shouldn't put more secrets than it needs in its env.

## 2. Terms and limits on a subscription token in CI

**Allowed for the owner's own use. It counts against the owner's plan limits.**

- Anthropic documents this exact use. The GitHub Actions page has you add a `CLAUDE_CODE_OAUTH_TOKEN` secret "that authenticates with your Claude subscription", made with `claude setup-token`. It adds that "if you authenticate with an OAuth token, runs use your Claude subscription instead of API billing" ([GitHub Actions](https://code.claude.com/docs/en/github-actions)).
- Under [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance), Pro, Max and Ultra use falls under the Consumer Terms. OAuth "is designed to support ordinary use of Claude Code". Developers "building products or services … including those using the Agent SDK, should use API key authentication", and Anthropic forbids "third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users." Here the owner's token runs the owner's tests in the owner's CI. There is no third-party user and nothing is resold, so neither prohibition applies. The CLI binary also runs unmodified, as published.
- **Limits:** "Advertised usage limits for Pro, Max, and Ultra plans assume ordinary, individual usage of Claude Code and the Agent SDK" (same page). CI agent steps draw on the same limits as the owner's interactive use. A rate limit shows up as `MODEL_PROVIDER_FAILED` (see §4). Anthropic "may [enforce] without prior notice".
- The token is tied to one person's subscription. The docs advise an API key for secrets shared across an organization ([GitHub Actions, organizations](https://code.claude.com/docs/en/github-actions#set-up-for-an-organization)). That doesn't apply to a one-dev repo.
- Once the repo is public: GitHub withholds secrets from fork PRs. The e2e workflow on EAS triggers only from `rc/*` and manual dispatch, so that's moot. Still, never expose the token to untrusted PR code.

**Unverified:** no published number for plan limits applies to CI. Whether a token outlives a plan downgrade or a password change isn't documented.

## 3. How `.e2e/cache` works

Source: [Caching](https://e2e.com/docs/cache) (live page and shipped `cache.mdx`), [Security, cache trust](https://e2e.com/docs/reference/security#cache-trust), `ci.mdx`, `e2e/dist/cache/identity.js`.

**What it stores.** Only `agent.act` steps are cached. `agent.assert`, `agent.waitFor` and `agent.extract` always run live. Each entry is one JSON file under `.e2e/cache/`, named by a hash of its key. It holds the actions, target descriptions, typed text, a step summary, and end checks (the route, plus up to 8 controls that appeared and 8 that went away). A recording is saved only when a later check in the attempt passed, such as a locator `expect` or `waitFor`.

**Secrets.** Entries hold "no prompts, conversations, screenshots, observed trees, or secret values". A secret fill stores only the secret's name. **Other typed values are stored verbatim.** In this repo the sign-in helper types the password with `pressSequentially` as a plain string. That's a locator step, not an agent step, so it never reaches the cache. ADR 0011 already bars passing it to an agent step. Review committed entries in their PR, because the docs treat them as test data.

**What the key holds** (`buildTraceCacheKey`): project id (the `package.json` `name` when no `projectId` is set, so it's stable across checkouts), test id, **target id and platform**, engine name and SPI version, step kind, call index, instruction and params digests, **app identity (bundle id)**, agent name and context digest, cache schema and policy version. It doesn't hold the device, the model, the executor or the engine package version.

**Portability:**

- _Across machines:_ yes, given the same `package.json` name. The CI docs say: "The replay cache key holds the app, not the device, so a step recorded on your simulator replays on the CI one."
- _iOS vs Android:_ separate entries, because target and platform are in the key. Both live in one directory, and a step has to be recorded on each target.
- _Local vs cloud device:_ the same entry is used. Replay finds each control again by role, name, test id and context, and anchors on `<bundle id> / <screen title>`. It can still miss on a cloud sim with a different iOS/Android version, since the accessibility tree changes between releases (`ci.mdx`), or on a bare-point tap at another screen size (`viewport-changed`). The local devices run iOS 27 and Android 37.2. What the Expo Simulators run is unverified.
- _Upgrades:_ a new `e2e` version that changes matching rekeys every entry, so they all record again.

**Committing it.** `e2e init` gitignores `.e2e/cache/`. This repo ignores all of `/.e2e/` (`.gitignore` line 55), so committing the cache needs `!/.e2e/cache/` while traces and results stay ignored. CI defaults the mode to `read-only` (with `CI` set and `cache` unset), so CI never writes entries. Local runs leave committed files unchanged unless something changed.

**`--strict-cache`** (or `cache: { strict: true }`; the docs prefer the flag in CI):

- A recording that exists but no longer replays fails with **`REPLAY_STALE`**: exit 2, not retried, no model call. The reasons are `invalid-entry`, `wrong-context`, `target-not-found`, `target-ambiguous`, `viewport-changed`, `action-failed`, `action-uncertain`, `end-mismatch`, and `no-entry` when a recording of the step exists under another key.
- **A step that was never recorded still runs live** and calls the model, as do `gap` and `truncated` recordings and a failed store read. Strict mode doesn't stop all model calls. It stops paying for stale ones.
- A strict run never writes or deletes an entry. To fix one, re-record locally in `read-write` mode without the flag, then commit it.
- Without strict, a stale committed entry hands off to the agent, and "every CI run pays for model calls until someone records it again."

## 4. A run with no agent config or no token

From `docs/reference/errors.mdx`, `docs/reference/config.mdx`, `e2e/dist/run/fixtures.js` and `@e2e-dev/acp/dist/executor.js`:

- **Tests without agent steps** need no model and no token ("Tests without agent steps need no model", `models.mdx`). `@e2e-dev/acp` loads the ACP SDK and spawns the agent only when the first agent step can't replay ("a process that never runs an ACP step never loads it", `session.js`). **That's the current suite.**
- **Agent steps that all replay** from the cache start no agent, so no token is needed. "The first agent step that the cache can't replay starts it" (`subscriptions.mdx`).
- **No `agents` key in the config:** `default` still exists, with no model. The first `agent.*` call fails with **`MODEL_UNAVAILABLE`**, which is "recorded once as a run-level error, and the run stops", exit 2. It evicts no recording. Locator-only tests run normally, because the agent is built lazily (`fixtures.js`).
- **`claudeCode()` configured but no token or login**, on a miss or hand-off: the adapter refuses the session with ACP `authRequired`. `@e2e-dev/acp` throws "the agent is not signed in: run `claude` and log in, or set ANTHROPIC_API_KEY", wrapped as **`AgentError('MODEL_PROVIDER_FAILED', 'The ACP agent did not start: …')`**. That step **fails** the test. It isn't skipped and doesn't crash the run: category infrastructure, exit 3. CI retries each test once by default; whether this code is retried wasn't checked. It **evicts no recording**, so a later run with the token still replays.
- **With `--strict-cache` and no token:** a stale entry fails with `REPLAY_STALE` before any agent starts. A never-recorded step still tries the agent and fails with `MODEL_PROVIDER_FAILED`.
- **Missing adapter package:** `INVALID_CONFIG` when the config loads, before any test runs.

**Unverified:** the exact error text from a CLI with no credentials on Linux. The mapping above comes from reading the code, not from a run.

## What this means for the spec (#346)

- Set `CLAUDE_CODE_OAUTH_TOKEN` as an EAS secret on the e2e job only (HITL: the owner runs `claude setup-token`). Never set `ANTHROPIC_API_KEY` beside it. Track the one-year expiry.
- Run `CI=1 npx e2e run --strict-cache` with a committed `.e2e/cache/` once agent steps exist. With today's locator-only suite the token is never used, so the first CI run can't prove the auth path. A small spike with one `agent.act` would.
- Re-record each agent step on both targets, and check whether recordings made on local devices replay on Expo Simulators at their OS versions.
- ADR 0011's "Local only" line and its "committed replay cache with `--strict-cache`" consequence both need amending in the spec.
