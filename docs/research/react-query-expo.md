# Research: React Query v5 on Expo 57 / React Native

Answers [#58](https://github.com/Wojtas399/bh-cycling-app/issues/58), a child of the map [#57](https://github.com/Wojtas399/bh-cycling-app/issues/57). Researched 2026-10-09 against the stack in `package.json`: Expo `~57.0.26`, React Native `0.86.3`, React `19.2.3`, jest-expo `~57.0.5`, `@testing-library/react-native` `^14.0.1`, TypeScript `~6.0.3`, with React Compiler on (`app.json` → `experiments.reactCompiler: true`).

Source key: **[npm]** is `npm view` against the registry on the date above. **[src]** is the published source of `@tanstack/query-core@5.104.1` (from `npm pack`) or files under this repo's `node_modules`. **[probe]** is a throwaway Jest test run under this repo's jest-expo preset.

## TL;DR

- **Install `@tanstack/react-query@^5.104.1`** (latest, 2026-10-02). Its peer range is `react: ^18 || ^19`, it has no React Native–specific peers, and its only dependency is `@tanstack/query-core` at the same version. I found no open RN or React 19 compatibility issues. [npm]
- **None of the focus or reconnect behaviour works on native until we wire it.** Both managers only subscribe through `window.addEventListener`, and React Native's `window` has no such method. So on iOS and Android, `refetchOnWindowFocus` and `refetchOnReconnect` never fire, and `onlineManager` assumes we are always online. On **web** (`react-native-web`) both are active by default. [src]
- **`signal` works through RN `fetch`.** RN 0.86's `fetch` is `whatwg-fetch@3.6.20` running over XHR, and it calls `xhr.abort()` when the signal fires. `AbortController` comes from the `abort-controller@3.0.0` polyfill. [src]
- **Testing:** `renderHook` in RNTL 14 is **async** and accepts a `wrapper`. Use a fresh `QueryClient` per test with `retry: false` and `gcTime: Infinity`, or call `queryClient.clear()` in `afterEach`. jest-expo defines `window`, so Query treats tests as a **client**: 3 retries and 5-minute gc timers apply unless we override them. [src][probe]
- **Devtools:** pick between `@dev-plugins/react-query@0.4.0` (Expo's own, zero config, no-op in production, but no release in about a year) and `@rozenite/tanstack-query-plugin@2.4.0` (Callstack, active, needs a Metro wrapper). The web package `@tanstack/react-query-devtools` renders DOM and does not work on native.
- **Defaults that differ from today's hooks:** 3 retries with exponential backoff (about 7 s before an error shows, and they **retry `IntervalsAuthError` too**), `staleTime: 0`, `refetchOnMount`, `gcTime` 5 minutes (today's cache lasts the whole session), and `networkMode: 'online'` (once `onlineManager` is wired, an offline query stays in `pending`/`paused` instead of failing).

## 1. Compatibility with React 19.2 and RN 0.86

| Package                         | Version                | Peers                 |
| ------------------------------- | ---------------------- | --------------------- |
| `@tanstack/react-query`         | `5.104.1` (2026-10-02) | `react: ^18 \|\| ^19` |
| `@tanstack/query-core`          | `5.104.1`              | none                  |
| `@tanstack/eslint-plugin-query` | `5.104.1`              | n/a                   |

Source: [npm]. v5 releases ship every few days (5.100 through 5.104 landed between April and October 2026). There is no React Native entry point, because the same package serves every React renderer.

- The [React Native guide](https://tanstack.com/query/latest/docs/framework/react/react-native) says the library works out of the box on RN. The only extra work it describes is wiring focus and online state, plus optional per-screen focus handling (see §2).
- **React Compiler is on in this app.** In [TanStack/query#9977](https://github.com/TanStack/query/issues/9977), a component did not re-render under the compiler. The maintainer's diagnosis was that the wrapper function wasn't named `use…`, so it wasn't treated as a hook. Every custom hook that calls `useQuery` therefore needs a `use` prefix. A reported loss of referential stability under the compiler ([#9571](https://github.com/TanStack/query/issues/9571), [facebook/react#34211](https://github.com/facebook/react/issues/34211#issuecomment-3193526034)) turned out to be a broken repro, not a library bug.
- **`isServer` detection:** query-core treats a missing `window` as "server" (`utils.ts`: `typeof window === 'undefined' || 'Deno' in globalThis`). RN's `setUpGlobals.js` sets `global.window = global`, so the app runs in client mode. On a server, the defaults would be `retry: 0` and `gcTime: Infinity`. [src]

## 2. `focusManager` ↔ `AppState`, `onlineManager` ↔ network

### Why wiring is needed

`focusManager` and `onlineManager` set up listeners only when `typeof window !== 'undefined' && window.addEventListener` is true. The source comments on this directly: "addEventListener does not exist in React Native, but window does". On native, no listener is attached, so:

- `focusManager.isFocused()` falls back to `true`, and focus refetches never fire.
- `onlineManager` starts at `#online = true` and never changes.

Source: `focusManager.ts`, `onlineManager.ts` [src].

### Focus (official recipe, [RN guide](https://tanstack.com/query/latest/docs/framework/react/react-native#refetch-on-app-focus))

```ts
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { focusManager } from '@tanstack/react-query';

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}

// in a root effect:
const sub = AppState.addEventListener('change', onAppStateChange);
return () => sub.remove();
```

It is skipped on web because `visibilitychange` already handles focus there.

### Online state: which package

Both options are in Expo 57's `bundledNativeModules.json`, so `npx expo install` pins them. [src]

| Package                           | SDK 57 version | Notes                                                                                                                                                                                                                                               |
| --------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo-network`                    | `~57.0.2`      | First-party Expo module and included in Expo Go. Provides `addNetworkStateListener`, `getNetworkStateAsync` and `useNetworkState`. `isInternetReachable` matches `isConnected` on iOS. ([docs](https://docs.expo.dev/versions/latest/sdk/network/)) |
| `@react-native-community/netinfo` | `12.0.1`       | Community standard, used in TanStack's first example.                                                                                                                                                                                               |

The TanStack RN guide shows both. For `expo-network`, it adds `addNetworkStateListener` and also seeds the initial state with `getNetworkStateAsync()`, catching any rejection:

```ts
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

onlineManager.setEventListener(setOnline => {
  let initialised = false;
  const sub = Network.addNetworkStateListener(state => {
    initialised = true;
    setOnline(!!state.isConnected);
  });
  Network.getNetworkStateAsync()
    .then(state => {
      if (!initialised) setOnline(!!state.isConnected);
    })
    .catch(() => {});
  return sub.remove;
});
```

**Recommendation:** use `expo-network`. It is first-party and versioned with the SDK, which matches how the repo already uses `expo-*` modules. Both packages contain native code, so adding either one means rebuilding the dev client (`expo-dev-client` is already installed).

**Gotcha: `networkMode`.** Once `onlineManager` is wired, the default `networkMode: 'online'` changes what happens offline. A query started while offline stays in `status: 'pending'` with `fetchStatus: 'paused'` until the connection returns, and retries in progress pause as well ([network mode guide](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)). Today the hooks show an `error`/`hidden` state when offline. To keep that behaviour, either set `networkMode: 'always'` or map `paused` to the error UI.

### Screen focus (Expo Router)

The RN guide adds two optional patterns built on React Navigation hooks: refetch stale queries in `useFocusEffect`, skipping the first call, and pass `subscribed: useIsFocused()` to `useQuery` so hidden tabs don't re-render. `expo-router` re-exports both `useFocusEffect` and `useIsFocused` (`expo-router/build/exports.d.ts`), so no `@react-navigation/native` import is needed. [src]

## 3. Passing `signal` through `fetch` on RN/Hermes

- **How Query uses it:** the `queryFn` context includes `signal`. If the function reads it, Query aborts the request when the query becomes unused or when `cancelQueries` is called, and the query reverts to its previous state. If the function never reads it, an unmounted query's request still completes and its result is cached. Cancellation does not apply to the Suspense hooks. ([query cancellation guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation))
- **RN 0.86 runtime:** `Libraries/Network/fetch.js` loads `whatwg-fetch` (`3.6.20`). That implementation reads `init.signal`, rejects at once if the signal is already aborted, calls `xhr.abort()` on `abort`, and rejects with `DOMException('Aborted', 'AbortError')`, using its own `DOMException` shim when the global is missing. `Libraries/Core/setUpXHR.js` adds `AbortController` and `AbortSignal` from `abort-controller@3.0.0`. Cancellation therefore works end to end on device. [src]
- **What we need to change:** `lib/intervalsApi.ts#request` does not accept a signal yet. It would need an optional `{ signal }` parameter forwarded to `fetch(url, { headers, signal })`, and the same parameter threaded through `getCalendarEvents`, `getActivities` and `getAthleteSettings`.
- **Jest vs device gap:** the `abort-controller@3.0.0` polyfill (2019) does not implement newer APIs such as `AbortSignal.timeout()`, `AbortSignal.any()` or `signal.reason`. Jest runs on Node, where my probe found `AbortSignal.timeout` defined. A test can pass while the same code fails on a device, so avoid these APIs. [src][probe]
- **Abort errors are not app errors:** Query handles a cancelled fetch internally (`CancelledError`, revert). Our own `catch` blocks, such as the auth-error handling, must not treat an `AbortError` as a failure.

## 4. Testing with jest-expo and RNTL 14

Findings:

- **`renderHook` is async in RNTL 14:** `renderHook(hook, { initialProps?, wrapper? }): Promise<{ result, rerender, unmount }>`, and `rerender`/`unmount` return promises too (`dist/render-hook.d.ts`). The existing tests already use `await renderHook(...)`. RNTL 14 declares `test-renderer ^1.0.0` as a peer, not `react-test-renderer`. [src]
- **Per-test client and wrapper** ([testing guide](https://tanstack.com/query/latest/docs/framework/react/guides/testing)): create a new `QueryClient` per test, because a shared one leaks cache between tests. `retry: false` in `defaultOptions` only sets a default, so an explicit `retry` in a hook's options overrides it.
- **jest-expo counts as a client.** My probe found `typeof window === 'object'` under the jest-expo preset, with `window.addEventListener` undefined. So `isServer` is `false`, and the defaults are `retry: 3` and `gcTime: 5 min`. A 5-minute gc `setTimeout` per query is what produces open handles and "Jest did not exit". `gcTime: Infinity` schedules no timer at all, because `isValidTimeout` rejects `Infinity` (`removable.ts`). [src][probe]
- **Fake timers:** v5 routes timers through `timeoutManager`, whose default provider wraps the globals lazily: `setTimeout: (cb, d) => setTimeout(cb, d)`. The source comment says this is so test fakes that replace the global still work. `notifyManager` batches renders through `setTimeout(cb, 0)`. As a result, `jest.useFakeTimers()` controls both retries and render batching, and RNTL's `waitFor` advances Jest fake timers automatically. Wrap any manual `jest.advanceTimersByTime` in `act` (RNTL `understanding-act.md`). [src]
- **No logger setup:** v5 removed `setLogger`, so the old v3/v4 "silence the logger in tests" recipes don't apply.

Suggested helper:

```tsx
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(client = createTestQueryClient()) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// const { result } = await renderHook(() => useUpcomingWorkouts(), { wrapper: createWrapper() });
```

Keep mocking `@/lib/intervalsApi` with `jest.mock`, as the current tests do. Avoid module-level `focusManager`/`onlineManager` wiring in code that tests import, or mock `expo-network` if they do import it.

## 5. Devtools for React Native

| Option                              | Package and version                                                  | Maintainer and status                                                                                                                                                                                                                                  | Expo dev build                                                                                                                     | Excluded from production by                                                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expo DevTools plugin**            | `@dev-plugins/react-query@0.4.0`                                     | Expo (`expo/dev-plugins`, not archived; repo pushed 2026-09). This package was last released **2025-10-14**. Peers: `@tanstack/react-query: *`, `expo >= 53.0.5`. Open issues: #39 ("not showing data") and #58 (Jest "unexpected token").             | Yes. JS only, opened from `npx expo start` with Shift+M, and displayed in a Chrome window.                                         | `src/index.ts` exports a no-op `useReactQueryDevTools` when `process.env.NODE_ENV === 'production'`, and the package sets `"sideEffects": false`. Expo's docs: "enabled only in development mode".                                      |
| **Rozenite TanStack Query plugin**  | `@rozenite/tanstack-query-plugin@2.4.0` with `@rozenite/metro@2.4.0` | Callstack (`callstackincubator/rozenite`, active, pushed 2026-10). Listed first in TanStack's RN docs. Supports Expo SDK 52+ and RN 0.76+.                                                                                                             | Yes. Runs as a panel in React Native DevTools. Setup: `npx rozenite@latest init` and wrap the Metro config in `withRozenite(...)`. | Disabled unless enabled, e.g. `withRozenite(config, { enabled: process.env.WITH_ROZENITE === 'true' })`. Install as a devDependency. The docs don't say whether the hook is stripped from the bundle, so it may need a `__DEV__` guard. |
| **Buoy** (in-app floating devtools) | `@buoy-gg/react-query@7.0.65`                                        | Buoy LLC. Very active (published 2026-10-09). The repo licence is "Other" (not OSI), and it **needs a Free or Pro Buoy account**. The desktop app is proprietary and replaced `LovesWorking/rn-better-dev-tools`, which TanStack's docs still link to. | Needs a dev build.                                                                                                                 | Vendor docs (not verified).                                                                                                                                                                                                             |
| Flipper plugin                      | `react-query-native-devtools@4.0.0`                                  | **Dead**: last published 2022, peers `react-query ^3` and Flipper.                                                                                                                                                                                     | —                                                                                                                                  | —                                                                                                                                                                                                                                       |
| Reactotron plugin                   | `reactotron-react-query@2.0.2`                                       | Last release 2025-06. Only worth it if we adopt Reactotron.                                                                                                                                                                                            | —                                                                                                                                  | —                                                                                                                                                                                                                                       |
| Web devtools                        | `@tanstack/react-query-devtools@5.104.1`                             | Official, but DOM-only, so it works only in the `expo start --web` target.                                                                                                                                                                             | No (native)                                                                                                                        | `NODE_ENV` (it is a no-op in production).                                                                                                                                                                                               |

**Recommendation:** start with `@dev-plugins/react-query`. It needs no Metro changes, is a single hook call (`useReactQueryDevTools(queryClient)`), and has a production no-op built in. If it breaks on a future Query version, given the year without a release, switch to Rozenite, which is the actively maintained option TanStack itself points to.

## 6. Defaults that silently differ from today's hooks

Today, `useCalendarRange`, `useUpcomingWorkouts` and `lib/intervalsApi.ts` make one attempt per load with no retry, never refetch on focus or reconnect, and cache in memory for the whole session (`dayCache`/`fetchedDates` in `lib/calendarWorkouts.ts`, see ADR 0001). The calendar refetches only on navigation to an unfetched range or on pull-to-refresh. Sources for the v5 defaults: [important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), `retryer.ts`, `removable.ts`.

| Default (v5, client)                                                 | Effect here                                                                                                                                                                                 | Likely override                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `retry: 3`, exponential `retryDelay` (1 s, 2 s, 4 s, capped at 30 s) | Errors appear about 7 s later. It also **retries `IntervalsAuthError` (401) three times** before `handleIntervalsAuthError` can run.                                                        | `retry: (n, e) => !(e instanceof IntervalsAuthError) && n < N`, or `retry: false` to match today. Relevant to #60. |
| `staleTime: 0` combined with `refetchOnMount: true`                  | Every remount of the Home or Calendar screen refetches in the background. Today the cache is reused.                                                                                        | `staleTime: Infinity` (or a long value) to keep "fetch once per session, pull to refresh".                         |
| `refetchOnWindowFocus: true`                                         | **No-op on native** until `focusManager` is wired, then it refetches stale queries on app foreground. Active on web.                                                                        | Decide explicitly. With `staleTime: Infinity` it has no effect.                                                    |
| `refetchOnReconnect: true`                                           | **No-op on native** until `onlineManager` is wired.                                                                                                                                         | Same as above.                                                                                                     |
| `networkMode: 'online'`                                              | Once `onlineManager` is wired, offline queries pause in `pending` instead of erroring, so the UI shows "loading" rather than "error".                                                       | `'always'`, or map `fetchStatus === 'paused'`.                                                                     |
| `gcTime: 5 min`                                                      | When no observer exists (for example a month the user navigated away from), its data is dropped after 5 min. Today's cache lasts the whole session.                                         | `gcTime: Infinity` if we keep session-long semantics. Relevant to #59.                                             |
| `structuralSharing: true`                                            | `replaceEqualDeep` keeps unchanged sub-objects referentially stable. It is safe for JSON from the API. Non-plain values (class instances, `Map`) are replaced wholesale rather than merged. | Keep the default. Only matters if `select` or the `queryFn` returns non-JSON shapes.                               |
| Unmount does not cancel unless `signal` is used                      | Today a `cancelled`/`requestId` flag drops late results. With Query, the late result is cached (no stale-state bug, because state is keyed by query key).                                   | Pass `signal` (§3).                                                                                                |
| `throwOnError: false`                                                | Errors surface as `status: 'error'`, matching today's state machines.                                                                                                                       | Keep.                                                                                                              |

Clearing data when the user disconnects or the account changes is no longer automatic. Today the cache is keyed by `cacheOwner` and cleared by `handleIntervalsAuthError`. With Query, either the `athleteId` goes into every query key or we call `queryClient.removeQueries`/`clear()` on disconnect or sign-out (#59, #60).

## Sources

- TanStack Query docs: [React Native](https://tanstack.com/query/latest/docs/framework/react/react-native), [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing), [Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation), [Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- `@tanstack/query-core@5.104.1` source: `focusManager.ts`, `onlineManager.ts`, `environmentManager.ts`, `utils.ts`, `removable.ts`, `retryer.ts`, `timeoutManager.ts`, `notifyManager.ts`
- TanStack issues [#9977](https://github.com/TanStack/query/issues/9977) and [#9571](https://github.com/TanStack/query/issues/9571)
- Expo docs: [DevTools plugins](https://docs.expo.dev/debugging/devtools-plugins/), [expo-network](https://docs.expo.dev/versions/latest/sdk/network/); `expo/bundledNativeModules.json` (SDK 57)
- [expo/dev-plugins `packages/react-query`](https://github.com/expo/dev-plugins/tree/main/packages/react-query) (`src/index.ts`, `package.json`, commit history)
- Rozenite docs: [TanStack Query plugin](https://www.rozenite.dev/docs/official-plugins/tanstack-query), [Getting started](https://www.rozenite.dev/docs/getting-started), [Compatibility](https://www.rozenite.dev/docs/compatibility)
- [Buoy-gg/buoy](https://github.com/Buoy-gg/buoy), [LovesWorking/rn-better-dev-tools](https://github.com/LovesWorking/rn-better-dev-tools) README
- React Native 0.86.3 `Libraries/Network/fetch.js`, `Libraries/Core/setUpXHR.js`, `Libraries/Core/setUpGlobals.js`; `whatwg-fetch@3.6.20`; `abort-controller@3.0.0`
- `@testing-library/react-native@14.0.1` `dist/render-hook.d.ts`, `package.json`, `docs/guides/understanding-act.md`, `docs/cookbook/async-events.md`
- npm registry metadata for every package named above (versions, dates, peers)
