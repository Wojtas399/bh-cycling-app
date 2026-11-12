# E2E tests

How agents run and write the end-to-end suite. `docs/e2e.md` is the full guide: device setup, env variables, build, run commands and known issues. ADR 0011 says why the suite is built this way.

## Run the suite

1. Rebuild if app code changed since the last build, because the JS is bundled into it: `npm run e2e:build:ios` or `npm run e2e:build:android`.
2. Run `npm run e2e:ios` or `npm run e2e:android`. Both run the cache leak check and the seed first. To run one file, run `npm run e2e:seed`, then `npx e2e run --target <ios|android> e2e/tests/<file>.e2e.ts`.
3. Read the results from `.e2e/report.json` and each failed test's `trace.md` under `.e2e/results/`.

## Rules

- **Never read or print `.env.local`.** The config loads it. A missing variable shows up as `CONFIG_LOAD_FAILED`, naming it. `docs/e2e.md` lists the variable names.
- **Mask the test email** before you quote a trace or the report: `sed -E 's/[^ "]+@[^ "]+/<email>/g'`.
- **Keep the e2e devices free.** One run at a time per device, and no other agent-device session on "BH e2e iPhone" or `BH_e2e_Pixel` during a run, including T3's Device panel. A held device fails the run with `ENGINE_FAILURE: device … is owned by session …`.
- **Never type the real password into a field that isn't secure,** and never put a secret in an agent step. Screenshots aren't redacted.
- **An agent step never types a credential or personal value as plain text.** The replay cache in `.e2e/cache` is committed, and a recording keeps what the step typed. Credentials go through `credentials`, or the step uses a locator `fill`. `npm run e2e:check-cache` runs before the seed and fails when a cache file holds the test email, password or Intervals.icu key. It names only the files: delete them and record the step again.
- **Leave the test athlete's data to the seed.** The seed owns only events and Activities whose `external_id` starts with `e2e-`. Don't create, edit or delete anything else on the test athlete or the test user.
- **Write tests by `CODING_STANDARDS.md`:** locators first, a `testID` only when visible text is ambiguous or missing, `agent.act` only as a fallback, no `agent.assert`.
