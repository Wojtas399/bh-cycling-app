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
| Register or signal something for the life of a native view | A named, stable ref callback that returns its cleanup.                                                                          | `registerWhileAttached` in `lib/toast/ToastHost.tsx`, `signalOnDetach` in `BottomSheet`                 |
| Do something once the view has laid out                    | `onLayout`, guarded so the work runs once. `onLayout` runs again on every re-layout, such as a rotation.                        | The splash hides through `hideSplashScreen` in `lib/splashScreen.ts`.                                   |
| Adjust state when external data changes                    | Compare with the value you last saw during render, and call the setters there.                                                  | `app/(auth)/verify-email/useVerifyEmail.ts`                                                             |
| Fetch Intervals.icu data                                   | TanStack Query (ADR 0005).                                                                                                      |                                                                                                         |

- **Ref callbacks are for a native view attaching and detaching only.** Never fetch, send, navigate or sync state from one. The one exception: on detach, it may call a callback its caller supplied, as `signalOnDetach` calls `onDismissed`. That callback may navigate, as the Calendar's `closeThen` action does, but the ref callback itself still never does. Give it a name that says what it does, and keep it stable. React detaches it and attaches it again whenever its identity changes.
- **`useSyncExternalStore` is for real external state only:** Firebase, Firestore, the clock, `AppState`, or a module store that handlers write. Its subscribe function never exists to cause a side effect.
- **`useEffectEvent` isn't usable.** `rules-of-hooks` reports any call of an effect event outside an effect, and no effects are left to call it from. To read the latest prop from a ref callback, key the callback on a stable prop instead.

For reviewers:

- `npm run lint` catches every effect, so don't report those. Report a disguised effect: a ref callback that does more than attach, detach and call its caller's callback on detach, a subscribe function that causes a side effect, or a setter called during render for anything other than following changed data.

## ADRs are binding

- `docs/adr/` records accepted decisions, and code must follow them.
- A change that contradicts an ADR breaks this rule unless the same PR adds a new ADR that supersedes it.
- Reviewers: cite the ADR number when you report a conflict.
