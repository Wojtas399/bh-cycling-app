# No type assertions outside `lib/typed.ts`

## Status

Proposed (Spec #444)

## Context

Agents write much of this app, and agents reach for `as` whenever the types push back. An assertion tells the compiler to stop checking, so a renamed field, a widened API response or a half-built fixture compiles and fails at runtime instead. A baseline on 2026-11-19 found 158 assertions, not counting `as const`: 24 in app code, 134 in tests (60 of them `as jest.Mock`), and 20 in `functions/`.

## Decision

- **The ban.** `x as T`, `as unknown as T` and `<T>x` are banned in all linted code, tests and `e2e/` included. `@typescript-eslint/consistent-type-assertions` with `assertionStyle: 'never'` enforces it as an error.
- **Allowed forms.** `as const` stays, because it narrows to literal types and can't claim a type the value lacks. `satisfies` stays, because it checks without asserting, and it's the usual replacement. `x!` isn't covered here. Its existing rule already fails app code through `--max-warnings 0` and stays off in `__tests__/`.
- **The allowlist.** Only `lib/typed.ts` and `test-utils/**` may assert. `lib/typed.ts` holds the typed `Object.entries`, `Object.fromEntries` and pick helpers, and `readJson<T>`, the one trusted boundary for Intervals.icu responses. `test-utils/` holds fixture builders and fakes for library types. Adding a file to the allowlist, or a new wrapper to `lib/typed.ts`, needs a new ADR.
- **No disable comments.** ADR 0013 allows `eslint-disable-next-line <rule> -- <reason>`, but not for this rule. A check chained into `npm run lint` fails on any disable directive that names `consistent-type-assertions`.
- **Type predicates.** A named `x is T` function is allowed anywhere, but its body must check at runtime everything its type claims. Lint can't see that, so reviewers report it. A written predicate on an arrow passed straight to `.filter` or `.find` is banned, since TypeScript infers those. `asserts x is T` functions are banned outside `lib/typed.ts`.
- **When a library's types fall short,** try these in order: restructure so the types line up (`satisfies`, a concrete type, narrowing), then a named predicate that checks what it claims, then, last, a named wrapper in `lib/typed.ts` with its own ADR.
- **Untyped data from outside.** Intervals.icu JSON goes through `readJson<T>` and isn't parsed at runtime. Firestore documents are parsed with valibot.

## Considered Options

- **Banning `as const` too.** It would need a `literal<const T>(v: T): T` helper that does exactly what `as const` does under another name, most of all for `i18n/locales/pl.ts`, whose literal values type-check the `{{param}}` interpolations. It adds no safety.
- **Exempting all of `lib/`.** `lib/` holds 18 of the 24 app-code assertions and mixes domain logic with helpers, so the ban would barely bite.
- **Exempting tests.** Tests hold most of the assertions, and a forced partial fixture hides renamed fields there just as well.
- **Parsing every Intervals.icu response.** That means a schema for each large API type, while the app already degrades on missing fields. It's a separate decision.

## Consequences

- `functions/` is out of scope because nothing lints it yet. Linting it is a follow-up, and this ban extends there when it lands.
- The bundled OpenFreeMap style moves from JSON to a `.ts` module typed with `satisfies StyleSpecification`. Re-vendoring it means pasting JSON into that file.
- `getErrorCode` narrows with `in` and returns `''` for a code that isn't a string.
