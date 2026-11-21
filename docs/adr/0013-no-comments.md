# No comments in code

## Status

Accepted (Spec: Ban explanatory comments from code)

## Context

Agents write much of this app. When code feels odd, an agent tends to explain it with a comment instead of fixing it. A comment makes a workaround look acceptable, it goes stale without any test failing, and reviewers learn to skim past it. A baseline on 2026-11-17 found about 1,666 comments in 387 files: 1,200 JSDoc, 454 explanatory, plus issue numbers, URLs and a TODO. If code still needs a comment after you rename or extract something, the code should change.

## Decision

- **The ban.** Linted TS and JS has no comments: `app/`, `components/`, `lib/`, `hooks/`, `constants/`, `i18n/`, `e2e/`, `functions/`, `scripts/`, `__mocks__/`, `test-utils/` and all tests, with no exemption for test code. The ban covers JSDoc, TODO and FIXME, links, issue and ADR numbers, section banners, and commented-out code. `*.config.*` files, JSON, YAML, Markdown and native `ios/`/`android/` code are out of scope.
- **What survives.** Two directive forms, and only with a reason:
  - `// eslint-disable-next-line <rule> -- <reason>` or `// eslint-disable-line <rule> -- <reason>`. Block disables, file-wide disables and `eslint-enable` are banned.
  - `// @ts-expect-error: <reason>`. `@ts-ignore` and `@ts-nocheck` are banned.

  Nothing else is allowed: no `/// <reference>`, `@jest-environment`, `prettier-ignore` or `istanbul ignore`. A future need amends this ADR.

- **Where the "why" goes.** Put it in the name first. Whatever a name can't carry goes in a test name, the commit or PR body, `CONTEXT.md` for domain language, or an ADR when the three-part bar holds. It never goes in the code. Upstream issue URLs go in the PR.
- **Workarounds that must stay.** These are third-party bugs and platform quirks. The name says what the code does, not that it's a workaround (`dropUnrecoverableRejection`, not `sonnerHack`). A test named after the constraint pins the behaviour, and the PR tells the story.
- **A comment that won't refactor away is a design problem.** It never gets deleted with its reason moved into the commit. The PR lists it under Merge Danger, and the owner decides before merge.
- **Generated and vendored files are excluded by path, never by a header.** The check script keeps one path exclusion list, mirrored in ESLint's `ignores`. Adding a path is an ordinary PR, which names the generator or upstream the file comes from. Excluded paths never hold hand-written code. A repo LICENSE file isn't TS/JS and isn't affected.
- **Enforcement.**
  - `scripts/check-no-comments.js` reads every leading and trailing comment range with TypeScript's scanner, skipping JSX text. It fails on any comment that isn't one of the two directive forms. It runs once, from root's `npm run lint`, over every tracked file, `functions/` included, so CI runs it. It reads tracked files only and has no off switch.
  - ESLint backs it in the editor: `eslint-comments/require-description` with `ignore: []`, and `@typescript-eslint/ban-ts-comment` with `ts-expect-error: 'allow-with-description'` and the other directives `true`.

### Considered and rejected

- **ESLint only.** A disable comment can switch it off, and no core rule bans every comment.
- **A grep.** It can't tell `//` in a string, a URL or JSX text from a comment. The scanner had zero false positives and zero false negatives on the repo.
- **Keeping JSDoc for public functions.** About 73% of it restated the name. The rest carried a unit or a constraint, which a name or a type can carry instead.
- **Allowing TODO with an issue link.** An issue tracks the work, and the TODO goes stale.
- **License and `@generated` header exemptions.** None exist. A header exemption would be a loophole, while a path is explicit and reviewed.

## Consequences

- Removing comments is refactoring, one directory per PR, never a bulk delete.
- Reading old reasoning now means `git blame` → PR, an ADR or a test name.
- A comment-shaped need that none of the above fits takes an ADR amendment, never a disable.
