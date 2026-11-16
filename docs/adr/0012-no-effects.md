# No effects in app code

## Status

Accepted (Spec #393)

## Context

Agents write much of this app, and agents reach for `useEffect` "just in case". An effect hides its coupling in a dependency array, invites infinite loops and race conditions, and makes "why did this run?" hard to answer. The app had 10 effects, all legitimate syncs with outside systems, but nothing stopped a bad one from being added, and a lint rule alone can be switched off with a disable comment.

The idea comes from "Why we banned React's useEffect" (alvinsng, Factory). This ADR is stricter: it has no `useMountEffect` escape hatch.

## Decision

- **The ban.** `useEffect` and `useLayoutEffect` are banned in all app code: screens, route-local hooks, shared hooks, components and `lib/`. There are zero exceptions, no disable comments and no wrapper such as `useMountEffect`. A comment that names either hook fails too, so comments say "effect". Effects inside third-party libraries (TanStack Query, React Navigation, React's own `useSyncExternalStore`) are out of scope. `useInsertionEffect` isn't covered, because it exists for CSS-in-JS libraries and the app has no use for it.
- **Exempt paths.** `e2e/` and `__tests__/` folders aren't app code, so the grep below skips them. The lint rule still covers them.
- **Replacements.** Each of the 10 effects became a primitive that states its intent:

  | Need                                     | Replacement                                                                                                         | Where                                                              |
  | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
  | Where the user may be                    | `Stack.Protected` guards. When a guard turns off, the router leaves its screens.                                    | `app/_layout.tsx`, `app/(auth)/_layout.tsx`                        |
  | The auth state                           | `useSyncExternalStore` over Firebase `onUserChanged`                                                                | `lib/authState.ts`, read by `hooks/useAuthState.ts`                |
  | Sending the verification email           | The sign-up and sign-in handlers, not the verify-email mount                                                        | `lib/verificationEmail.ts`                                         |
  | Blocking back while deleting the account | `usePreventRemove(busy, …)` in the hook, plus `gestureEnabled: !busy` in the screen's options                       | `app/(app)/delete-account/useDeleteAccount.ts` and its `index.tsx` |
  | Hiding the splash                        | The root view's `onLayout` once fonts have loaded                                                                   | `app/_layout.tsx`                                                  |
  | Today across midnight                    | `useSyncExternalStore`, whose subscribe arms a midnight timer and an `AppState` listener                            | `hooks/useToday.ts`                                                |
  | A resend countdown                       | An `endsAt` timestamp read against a shared one-second clock store                                                  | `hooks/useCooldown.ts`, `lib/secondClock.ts`                       |
  | The Intervals.icu connection             | `useSyncExternalStore` over the integration document's `onSnapshot`                                                 | `hooks/useIntervalsConnection.ts`                                  |
  | An Android sheet's toast host            | The `registerWhileAttached` ref callback with cleanup                                                               | `lib/toast/ToastHost.tsx`                                          |
  | The sheet's dismissed signal             | The `signalOnDetach` ref callback, whose cleanup fires when Expo UI unmounts the content after dismissal (ADR 0003) | `components/BottomSheet.tsx`                                       |

  Two more rules cover what an effect usually does. A value computed from props or state is derived during render. Work caused by a user action runs in that action's handler.

- **Ref callbacks: native view attach and detach only.** A ref callback that returns a cleanup (React 19) may register or signal something for the life of a native view, and nothing else. It isn't a mount hook, so it never fetches, sends, navigates or syncs state. Name it for what it does, as in `registerWhileAttached` and `signalOnDetach`. Keep it stable with `useCallback` and stable dependencies. React runs the cleanup and attaches again whenever the callback changes identity, so an unstable one would detach on every render. That's why `BottomSheet` keys `signalOnDetach` on `onDismissed` and asks callers for a stable `onDismissed`.
- **`useEffectEvent` isn't usable.** The spec planned to read the latest `onDismissed` through it. In `eslint-plugin-react-hooks` 7.1.1, `rules-of-hooks` reports any call of an effect event outside an effect, and with effects banned there is no place left to call one. `useEffectEvent` also returns a new function on every render, so a ref callback built on it would detach and fire on every render.
- **`useSyncExternalStore`: real external state only.** The snapshot reads state that lives outside React: Firebase, Firestore, the clock, `AppState`, or a module store that event handlers write, such as `lib/verificationEmail.ts`. The subscribe function only starts and stops listening. It never exists to cause a side effect, so it never sends, writes or navigates.
- **The auth state listens to `onUserChanged`.** The auth store in `lib/authState.ts` follows Firebase's `onUserChanged`, not `onAuthStateChanged`. Only `onUserChanged` fires after `currentUser.reload()`, and that reload is how verify-email learns the email was verified. It also fires on every sign-in and sign-out.
- **`usePreventRemove` and `Stack.Protected` coexist.** On delete account, the `usePreventRemove` callback dispatches every action again except `GO_BACK` and `POP`, so only back is blocked. When the deleted user's guard turns off, `Stack.Protected` dispatches no action. It changes the route list, which emits no `beforeRemove`. So the guard removes the busy screen, and the user lands on sign-in.
- **Setting state during render to follow external data is allowed.** This is React's "adjust state when a prop changes" pattern. Keep the value you last saw in state, compare it during render, and when it differs, update it and adjust whatever depends on it. Only state setters run there, never side effects. `useVerifyEmail` uses this to start the Resend cooldown when sign-up or sign-in records a send after the screen has mounted.
- **Enforcement.**
  - ESLint `no-restricted-syntax` selectors flag bare calls and `React.`-member calls of both hooks, with a message that cites this ADR. That puts the error in the editor.
  - `scripts/check-no-effects.sh` runs after `expo lint` in `npm run lint`, so CI's lint job runs it. It `git grep`s tracked `.ts` and `.tsx` files outside the exempt paths for either name as a whole word. Because it reads only tracked files, it never scans `node_modules` or untracked files.
  - **Why a grep and not only lint:** a disable comment switches a lint rule off, and a selector only sees the call shapes it names. The grep has no off switch, and it also catches aliased imports (`import { useEffect as onMount }`) and member access through any name.

### Considered and rejected

- **A `useMountEffect` wrapper,** as Factory allows. It's a rename that brings back every problem of an effect.
- **Lint only.** A disable comment switches it off.
- **Allowing effects that sync with outside systems.** Then every review has to judge whether an exception is justified. All 10 effects were such syncs, and each one had a primitive that does the same job.

## Consequences

- Each replacement states its intent where it's used, so "why did this run?" leads to a handler, a store, a guard or a view.
- `useIntervalsConnection` reads our own Firestore document through a sync store, not TanStack Query. ADR 0005 covers Intervals.icu API data, and this document isn't that.
- An unverified user who reopens the app no longer gets an automatic verification email. They tap Resend, which is ready straight away. Signing out from verify-email now takes the user to sign-in.
- `BottomSheet` needs a stable `onDismissed`. If a new function arrives while the sheet is shown, the old one is called.
- A need that none of the replacements fits takes a new ADR that supersedes this one, never a disable comment.
