# Workout Status is applied at read time on every surface

## Status

Accepted. Supersedes the part of ADR-0007 that says Home "derives Workout Status inside the fetch". The rest of ADR-0007 stands.

## Context

Workout Status "as of today" was applied in three different ways:

- Home's Upcoming query computed it inside its `queryFn`, with `today` in the key.
- A Calendar month applied it with `select(withItemStatuses)`.
- Workout Details applied it with a `select` that built a completed set of its own from a single `completed` flag.

The three paths drifted apart. Each surface needed its own pairing helper (`pairWorkouts` and `pairWorkout`, which differ in what counts as completed) and its own test setup. The Calendar Items module (Spec: Calendar Items module) now owns the fetch, the pairing and the join for all three surfaces, so there is a single place where status can be applied.

## Decision

- **Status is applied in a `select`, never in a `queryFn`.** Every surface caches the pairing as fetched: Calendar Items, or a paired Workout, together with `completedEventIds`. Each one derives Workout Status against `today` in its query's `select`, through the module's `withItemStatuses` or the status of the Workout returned by `findWorkout`.
- **`today` stays in Upcoming's key only because its range depends on it.** Upcoming shows today and tomorrow, so a new day is a new range and a new fetch. The key doesn't carry `today` for status.
- Keeping Home's status inside the fetch was rejected: it was the only surface that did it that way, and it forced a pairing path of its own.

## Consequences

- No cached query value ever holds a Workout Status. A Workout that passes its day without being paired becomes `missed` on the next render, without a refetch. Calendar months and Workout Details already behaved this way, and now Home does too.
- Workout Details reads the real `completedEventIds` from the module, so a Workout is `completed` by exactly the rule that Home and Calendar apply (ADR-0009).
