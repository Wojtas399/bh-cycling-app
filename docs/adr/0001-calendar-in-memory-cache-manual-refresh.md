# Calendar caches workout data in memory for the session, refreshed only on explicit user action

## Status

Accepted

## Context

The Calendar screen supports unbounded month/week navigation and needs the bottom sheet and monthly/weekly views to reuse already-fetched data without a refetch on every visit. The existing Intervals.icu integration principle is "fresh on each screen load, no caching," but honoring that literally here would mean refetching on every tab switch and defeat the reuse requirement.

## Decision

Calendar keeps a module-level, in-memory (not Firestore) per-day cache of joined Event+Activity status that persists across screen mounts for the app session, with no automatic eviction, prefetching, or time-based invalidation.

Freshness is the sole responsibility of an explicit refresh button that clears the whole cache and eagerly refetches only the currently visible range. The cache is also cleared on Intervals.icu disconnect and on auth errors, to avoid showing stale or wrong-account data after reconnect.

## Consequences

A day's `completed`/`planned`/`missed` status is computed once at fetch time, not recomputed at render, so it won't self-correct as real time passes or as new activities appear — the user must hit refresh to see updates.

We accepted manual refresh over automatic recomputation as the simpler v1 trade-off given unbounded navigation.
