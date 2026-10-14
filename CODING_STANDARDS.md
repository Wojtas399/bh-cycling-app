# Coding Standards

Binding rules for anyone writing or reviewing code in this repo, human or agent. The PR review bot reads this file.

## Test business logic, not UI

- **Business logic gets tests.** That means pure functions in `lib/`, hooks in `hooks/`, and route-local logic next to a screen in `app/**` (`use*.ts`, `*Errors.ts`). Put the tests in a `__tests__/` folder beside the module.
- **UI doesn't get tests.** That covers `components/**` and route screens (`index.tsx`, `_layout.tsx`). Don't add new UI test files. The existing ones (e.g. `components/__tests__/`) can stay, but don't extend them unless asked.
- **The seam:** if a component has logic worth testing, move it into a `lib/` function or a hook and test that. Don't render-test the component.

For reviewers:

- A UI change with no tests is fine. Don't report it.
- A new UI test file breaks this rule.
- Branching logic or data shaping left inside a component, where it can't be tested, is a judgement call. Suggest extracting it.

## ADRs are binding

- `docs/adr/` records accepted decisions, and code must follow them.
- A change that contradicts an ADR breaks this rule unless the same PR adds a new ADR that supersedes it.
- Reviewers: cite the ADR number when you report a conflict.
