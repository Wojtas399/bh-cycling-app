# Intervals.icu data is server state in TanStack Query

## Status

Accepted. Supersedes ADR-0001.

Superseded in part by ADR-0010: a read gated on a permission or scope check may hand its screen a view state instead of the raw query. The rest of this ADR stands.

Amended by Spec: Screen read set (#492): a screen refresh leaves out a Route that has loaded (see Freshness).

## Context

ADR 0001 gave the Calendar a hand-rolled, module-level per-day cache with its own owner tracking, generation counter and in-flight dedupe, while Home refetched with no cache. Every new screen reading Intervals.icu would need that machinery again, and data could only get fresher through the refresh button.

## Decision

Intervals.icu HTTP reads are `@tanstack/react-query` v5 queries, and remote-effect form submits (auth, settings, Intervals connect/disconnect) are mutations. Firestore subscriptions stay as they are; queries gate on them.

- **Cache shape.** Every key starts with `['intervals', athleteId, …]`, and the access token is never in a key. Calendar caches one query per month (the week view combines one or two), Home has its own events-only query keyed by today's date, and both read a shared `athleteSettings` query.
- **Clearing.** Sign-out and Account Deletion clear the whole client. An Intervals 401 and a disconnect cancel and remove the `['intervals']` prefix, aborting fetches in flight. 401s are routed by a global `QueryCache.onError` and never retried; the handler sets `needsReconnect` first, and every Intervals query is disabled while it is set.
- **Screens consume query results** (`data`, `isPending`, `isError`, `isFetching`) behind a `useIntervalsAvailability()` gate, not hand-written view-state unions — the pattern used in the developer's other project. Screens own the branching as a result.
- **Mutations live inside the existing form hooks**, which keep their return shape. Errors are derived from `mutation.error` through a per-form code mapper, user cancellation resolves instead of rejecting, and there is no shared wrapper.
- **Freshness.** Stale queries refetch when the app returns to the foreground. Calendar months and Home go stale after 5 minutes, athlete settings never. A month stores its workouts and completed event IDs, and Workout Status is derived from today's date at render, so planned turns into missed at midnight without a fetch. The refresh button stays. At parity it invalidates the Calendar months; once this policy lands it invalidates everything for the athlete. A screen refresh (pull to refresh, and the Calendar's button) skips one thing: a Route that has loaded, since a recorded GPS track doesn't change. A failed Route is retried. Tab focus and network reconnects don't trigger fetches.

The migration lands at parity first (session-long cache, manual refresh only), and the freshness policy follows it.

Considered and rejected:

- Keeping the module cache and adding time-based invalidation: rebuilds what the library already provides.
- Normalising months into per-day entries with `setQueryData`: entries without a `queryFn` can't refetch.
- Home reading Calendar months: fetches activities, and sometimes a second month, for two days of data.

## Consequences

- A newly completed workout still needs a refetch (foreground return or refresh) to show as completed.
- Off-screen months keep showing old data while they refetch, instead of a loading state.
- `onlineManager` isn't wired, so offline fetches fail rather than pause.
