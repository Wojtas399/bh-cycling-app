# Coding Standards

Binding rules for anyone writing or reviewing code in this repo, human or agent. The PR review bot reads this file.

## Test business logic in Jest and user-facing flows end to end

- **Business logic gets Jest tests.** That means pure functions in `lib/`, hooks in `hooks/`, route-local logic next to a screen in `app/**` (`use*.ts`, `*Errors.ts`), and pure e2e support code such as the seed planner. Put the tests in a `__tests__/` folder beside the module.
- **User-facing flows get e2e tests.** A flow is what an athlete does across screens, such as signing in and opening a Workout. The tests are `e2e/tests/**/*.e2e.ts` files that drive the staging Release build on a simulator and an emulator (ADR 0011). `docs/e2e.md` says how to run them.
- **Jest render tests of components and screens stay banned.** That covers `components/**` and route screens (`index.tsx`, `_layout.tsx`). Don't add new ones. The existing ones (e.g. `components/__tests__/`) can stay, but don't extend them unless asked.
- **The seam:** if a component has logic worth testing, move it into a `lib/` function or a hook and test that in Jest. What a screen shows is the e2e suite's job.
- **E2E steps and asserts are locators.** Match visible text with a regex, because merged labels carry icon glyphs on iOS. Reach fields by placeholder. Add a `testID` only when visible text is ambiguous or missing. Use `agent.act` only where no locator can reach an element, and never commit an `agent.assert`.
- **E2E tests are independent.** Each one starts signed out through the `test` from `e2e/support/fixtures.ts`, signs in through the shared helper, and asserts only on seeded Workouts, Races, Notes and Activities, never on other data on the test athlete.
- **No secret reaches an agent step.** Never pass a password, token or API key in an agent step's params.

For reviewers:

- A UI change with no Jest test is fine. Don't report it.
- A new Jest test file that renders a component or screen breaks this rule.
- Branching logic or data shaping left inside a component, where it can't be tested, is a judgement call. Suggest extracting it.
- A change to visible text, a placeholder or a `testID` that an e2e test matches breaks the suite unless the same PR updates the test. Report it.
- A new `testID` on an element that visible text already names uniquely breaks this rule.
- In an e2e test, an `agent.assert`, an `agent.act` where a locator would do, a secret in an agent step, or a fixture typed as `any` breaks this rule.
- A new user-facing flow with no e2e test is a judgement call. Suggest one, but don't block on it. The suite gates no PR. CI runs it only for PRs from `rc/*` to `main`, and on demand.

## Do this instead of an effect

`useEffect` and `useLayoutEffect` are banned in app code, with zero exceptions ([ADR 0012](docs/adr/0012-no-effects.md)). No disable comment, no wrapper such as `useMountEffect`, and no comment that names either hook. `npm run lint` fails on all of them, in CI too.

| You want to…                                               | Do this                                                                                                                         | Example                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Show a value computed from props or state                  | Derive it during render.                                                                                                        |                                                                                                         |
| Do work because the user acted                             | Do it in the event handler.                                                                                                     | Sign-up and sign-in send the verification email (`lib/verificationEmail.ts`).                           |
| Read state that lives outside React                        | `useSyncExternalStore`, with a subscribe that only listens.                                                                     | `hooks/useAuthState.ts` over `lib/authState.ts`, `hooks/useToday.ts`, `hooks/useIntervalsConnection.ts` |
| Count down or tick each second                             | Store when it ends and derive the rest from the shared clock store.                                                             | `hooks/useCooldown.ts`, `lib/secondClock.ts`                                                            |
| Send the user somewhere because of the auth state          | `Stack.Protected` guards. The router leaves screens whose guard turns off, so the handler never calls `router.replace` as well. | `app/_layout.tsx`, `app/(auth)/_layout.tsx`                                                             |
| Block back navigation while busy                           | `usePreventRemove(busy, …)` in the hook, plus `gestureEnabled: !busy` in the screen's options.                                  | `app/(app)/delete-account/useDeleteAccount.ts` and its `index.tsx`                                      |
| Register or signal something for the life of a native view | A named, stable ref callback that returns its cleanup.                                                                          | `registerWhileAttached` in `lib/toast/ToastHost.tsx`, `signalOnDetach` in `lib/bottomSheet.ts`          |
| Do something once the view has laid out                    | `onLayout`, guarded so the work runs once. `onLayout` runs again on every re-layout, such as a rotation.                        | The splash hides through `hideSplashScreen` in `lib/splashScreen.ts`.                                   |
| Adjust state when external data changes                    | Compare with the value you last saw during render, and call the setters there.                                                  | `app/(auth)/verify-email/useVerifyEmail.ts`                                                             |
| Fetch Intervals.icu data                                   | TanStack Query (ADR 0005).                                                                                                      |                                                                                                         |

- **Ref callbacks are for a native view attaching and detaching only.** Never fetch, send, navigate or sync state from one. The one exception: on detach, it may call a callback its caller supplied, as `BottomSheet`'s `signalDismissedOnDetach` calls `onDismissed`. That callback may navigate, as the Calendar's `closeThen` action does, but the ref callback itself still never does. Give it a name that says what it does, and keep it stable. React detaches it and attaches it again whenever its identity changes.
- **`useSyncExternalStore` is for real external state only:** Firebase, Firestore, the clock, `AppState`, or a module store that handlers write. Its subscribe function never exists to cause a side effect.
- **`useEffectEvent` isn't usable.** `rules-of-hooks` reports any call of an effect event outside an effect, and no effects are left to call it from. To read the latest prop from a ref callback, key the callback on a stable prop instead.

For reviewers:

- `npm run lint` catches every effect, so don't report those. Report a disguised effect: a ref callback that does more than attach, detach and call its caller's callback on detach, a subscribe function that causes a side effect, or a setter called during render for anything other than following changed data.

## Write no comments

Linted TS and JS has no comments ([ADR 0013](docs/adr/0013-no-comments.md)). That rules out JSDoc, TODO, links, issue numbers and commented-out code. Two forms are allowed, and only with a reason: `// eslint-disable-next-line <rule> -- <reason>` and `// @ts-expect-error: <reason>`. `npm run lint` fails on everything else, in CI too.

A swallowed error fails lint too: an empty `catch {}` (`no-empty`) and, in TS, `.catch(() => {})`. Drop a best-effort failure with `ignoreFailure(() => work())` from `lib/ignoreFailure.ts`, and start a mutation whose error shows on `mutation.error` with `mutate`.

| You want to say…                  | Put it in                                                  |
| --------------------------------- | ---------------------------------------------------------- |
| What it does                      | The name of the function, variable or type                 |
| A unit or constraint              | The name (`durationSeconds`) or the type                   |
| Why it behaves this way           | A test named after the behaviour                           |
| Why we chose this, upstream links | The PR body; an ADR if it's hard to reverse and surprising |
| A domain term                     | `CONTEXT.md`                                               |
| Work still to do                  | An issue                                                   |

For reviewers:

- `npm run lint` catches every comment, so don't report those.
- Report a name that hides a workaround (`hack`, `fix`, `temp`) instead of saying what the code does.
- Report a directive reason that only restates the rule.
- Report a new path in the check's exclusion list that holds hand-written code or whose PR doesn't name its generator.
- Report a workaround with no test named after its constraint.

## Write no type assertions

`x as T`, `as unknown as T` and `<T>x` are banned in all linted code, tests and `e2e/` included ([ADR 0014](docs/adr/0014-no-type-assertions.md)). Only `lib/typed.ts`, `test-utils/**` and `functions/test-utils/**` ([ADR 0015](docs/adr/0015-functions-test-utils-may-assert.md)) may assert. `as const` and `satisfies` stay allowed. No disable comment can hide an assertion: the comment check fails on any directive that names `@typescript-eslint/consistent-type-assertions`, even with a reason. `npm run lint` fails on all of them, in CI too.

| You want to…                                       | Do this                                                                                                                                       | Example                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check a value against a type                       | `satisfies`.                                                                                                                                  | `constants/ofmDarkStyle.ts`, `constants/theme.ts`                                                                                                        |
| Read a field from an `unknown` value               | Narrow with `typeof`, `!== null` and `in`.                                                                                                    | `lib/getErrorCode.ts`, `hooks/useFormTextField.ts`                                                                                                       |
| Keep the items of one type in `.filter` or `.find` | Write the arrow with no predicate annotation, and TypeScript infers it. When it can't, call a named predicate, or `flatMap` to `[x]` or `[]`. | `toTimedIntervalIfTimesUsable` in `lib/activityDetails.ts`                                                                                               |
| Reuse a type check                                 | A named `x is T` predicate whose body checks everything its type claims.                                                                      | `lib/isFiniteNumber.ts`, `isZone` in `lib/powerZones.ts`, `isTranslationKey` in `lib/validation.ts`                                                      |
| Read a Firestore document                          | Parse it with valibot, and map a failed parse to a state the screen already handles.                                                          | `hooks/useIntervalsConnection.ts`                                                                                                                        |
| Read an Intervals.icu response                     | `readJson<T>` from `lib/typed.ts`, the one trusted boundary.                                                                                  | `lib/intervalsApi.ts`                                                                                                                                    |
| Iterate, build or pick an object's keys            | `entries`, `fromEntries` and `pick` from `lib/typed.ts`.                                                                                      | `lib/intervalsApi.ts`, `lib/workoutDetails.ts`, `lib/activityDetails.ts`                                                                                 |
| Type a mock                                        | `jest.mocked(fn)`.                                                                                                                            |                                                                                                                                                          |
| Build a test fixture                               | A builder in `test-utils/` that fills every field from defaults and takes overrides.                                                          | `test-utils/calendarItems.ts`                                                                                                                            |
| Fake a library type in a test                      | A fake in `test-utils/`, or in `functions/test-utils/` for a Cloud Functions test.                                                            | `syntheticEvent`, `scrollEvent` and `emitterSubscription` in `test-utils/reactNative.ts`, `callableRequest` in `functions/test-utils/callableRequest.ts` |
| Feed a test raw Intervals.icu JSON                 | `fromIntervalsJson` for `null` fields, `readIntervalsBody` for a partial payload, with any field outside the type in its second argument.     | `test-utils/intervalsJson.ts`                                                                                                                            |
| Get past a library type that falls short           | Restructure so the types line up, then a named predicate, then, last, a named wrapper in `lib/typed.ts` with its own ADR.                     |                                                                                                                                                          |

- **A predicate is a claim too.** A named `x is T` function is allowed anywhere, but lint can't see whether its body checks what the type says. A written predicate on an arrow or function expression passed straight to `.filter` or `.find` fails lint, and so does an `asserts` function outside `lib/typed.ts`.
- **The allowlist is closed.** Adding a file to it, or a new wrapper to `lib/typed.ts`, needs a new ADR.
- **`x!` isn't covered here.** Its own rule still fails app code through `--max-warnings 0` and stays off in `__tests__/`.

For reviewers:

- `npm run lint` catches every assertion, every directive that disables the rule, written predicates on functions passed to `.filter` and `.find`, and `asserts` functions, so don't report those.
- Report a named `x is T` predicate whose body checks less than its type claims, such as one that checks a single field of a type with several.
- Report a new path in the assertion allowlist in `eslint.config.js` or `functions/eslint.config.js`, a new wrapper in `lib/typed.ts`, or a rule dropped from the comment check's never-disabled list, unless the same PR adds an ADR for it.

## Report unexpected errors to Sentry, and only those

The app reports errors to Sentry ([ADR 0017](docs/adr/0017-error-tracking-uses-sentry.md)). Sentry records unhandled errors and native crashes on its own. A render error reaches it through the root layout's `ErrorBoundary`, which reports it with its component stack once the fallback lays out (`lib/renderErrorReport.ts`). Other caught errors reach it through one place: the `onError` of the TanStack Query `QueryCache` and `MutationCache`.

- **Expected errors aren't reported.** An expected error is one the app already handles as a normal outcome: an `IntervalsAuthError`, no network or a timeout, the athlete cancelling (closing the OAuth or Google sign-in window), or a Firebase Auth error the athlete caused and sees a message for, such as a wrong password or an email already in use.
- **`ignoreFailure` doesn't report.** Its work is best effort by design. If a failure there matters, the work stops being best effort.
- **No ad hoc reporting in a `catch`.** Add one only when a specific case needs it, and say why in the PR.
- **No personal data in an event.** The user is the Firebase uid alone. Never attach an email, a token, an OAuth code or an Intervals.icu response body.

For reviewers:

- Report a new `reportError` call outside the query caches and the root `ErrorBoundary` that its PR doesn't justify.
- Report an expected error that reaches Sentry, and an unexpected one that the filter drops.
- Report personal data or a secret attached to an event, a breadcrumb or the user.

## ADRs are binding

- `docs/adr/` records accepted decisions, and code must follow them.
- A change that contradicts an ADR breaks this rule unless the same PR adds a new ADR that supersedes it.
- Reviewers: cite the ADR number when you report a conflict.
