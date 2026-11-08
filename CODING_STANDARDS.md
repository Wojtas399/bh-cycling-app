# Coding Standards

Binding rules for anyone writing or reviewing code in this repo, human or agent. The PR review bot reads this file.

## Test business logic in Jest and user-facing flows end to end

- **Business logic gets Jest tests.** That means pure functions in `lib/`, hooks in `hooks/`, route-local logic next to a screen in `app/**` (`use*.ts`, `*Errors.ts`), and pure e2e support code such as the seed planner. Put the tests in a `__tests__/` folder beside the module.
- **User-facing flows get e2e tests.** A flow is what an athlete does across screens, such as signing in and opening a Workout. The tests are `e2e/tests/**/*.e2e.ts` files that drive the staging Release build on a simulator and an emulator (ADR 0011). `docs/e2e.md` says how to run them.
- **Jest render tests of components and screens stay banned.** That covers `components/**` and route screens (`index.tsx`, `_layout.tsx`). Don't add new ones. The existing ones (e.g. `components/__tests__/`) can stay, but don't extend them unless asked.
- **The seam:** if a component has logic worth testing, move it into a `lib/` function or a hook and test that in Jest. What a screen shows is the e2e suite's job.
- **E2E steps and asserts are locators.** Match visible text with a regex, because merged labels carry icon glyphs on iOS. Reach fields by placeholder. Add a `testID` only when visible text is ambiguous or missing. Use `agent.act` only where a locator can't reach an element, such as a native alert, and never commit an `agent.assert`.
- **E2E tests are independent.** Each one starts signed out through the `test` from `e2e/support/fixtures.ts`, signs in through the shared helper, and asserts only on seeded Workouts, never on other data on the test athlete.
- **No secret reaches an agent step.** Never pass a password, token or API key in an agent step's params.

For reviewers:

- A UI change with no Jest test is fine. Don't report it.
- A new Jest test file that renders a component or screen breaks this rule.
- Branching logic or data shaping left inside a component, where it can't be tested, is a judgement call. Suggest extracting it.
- A change to visible text, a placeholder or a `testID` that an e2e test matches breaks the suite unless the same PR updates the test. Report it.
- A new `testID` on an element that visible text already names uniquely breaks this rule.
- In an e2e test, an `agent.assert`, an `agent.act` where a locator would do, a secret in an agent step, or a fixture typed as `any` breaks this rule.
- A new user-facing flow with no e2e test is a judgement call. Suggest one, but don't block on it. The suite runs by hand, not in CI.

## ADRs are binding

- `docs/adr/` records accepted decisions, and code must follow them.
- A change that contradicts an ADR breaks this rule unless the same PR adds a new ADR that supersedes it.
- Reviewers: cite the ADR number when you report a conflict.
