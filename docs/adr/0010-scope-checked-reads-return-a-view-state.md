# A scope-checked read may hand its screen a view state

## Status

Accepted. Supersedes, for scope-checked reads only, the part of ADR-0005 that says screens consume query results and not hand-written view-state unions. The rest of ADR-0005 stands.

## Context

ADR 0005 has screens consume TanStack Query results behind `useIntervalsAvailability()` and branch on them themselves. Home's Wellness card (#256) needs states the raw query can't express. When the stored scope lacks `WELLNESS:READ`, the query is skipped and looks the same as one without credentials, but the card has to ask the athlete to reconnect. A 403 has to ask the same thing, while any other failure hides the card. Branching on the raw query would put the scope check and that error mapping inside the component, where `CODING_STANDARDS.md` says it can't be tested.

## Decision

- **A hook may return a view state** instead of the raw query when a permission or scope check adds states the raw query can't express. The hook owns the branching, and the union is its tested seam. `useWellness()` is the first such hook, with `loading`, `hidden`, `needsScope`, `empty` and `ready` (#256).
- **The query itself still follows ADR 0005**, including its keys, clearing and freshness.
- **Nothing else qualifies.** A state that only renders `data`, `isPending`, `isError` or `isFetching` differently is no reason to write a union. Screens without a scope check keep branching on the raw query.

## Consequences

- Home mixes both styles: "Dziś i jutro" branches on its raw query, and the Wellness card renders the state `useWellness()` hands it.
- A later read gated on a scope that existing connections lack can follow `useWellness()`.
