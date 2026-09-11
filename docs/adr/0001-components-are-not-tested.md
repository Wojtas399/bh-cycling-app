---
status: accepted
---

# Components are not tested

Components are not tested — at all. No render tests, no screen tests, no `.tsx` files under any `__tests__/`. Business logic that needs a test is extracted into `lib/` or `hooks/` and tested there.

This is a ban, not a preference. A rule with an escape hatch decays back to the status quo: the next person to find an untested component would simply add a test. If the ban turns out too strict, a new ADR supersedes this one; exceptions are not carved out case by case.

## Why

A component's behaviour and what Jest can reach are different things. A bottom sheet's behaviour is gestures and animation — drag to dismiss, tap the backdrop, slide in and away — and Jest can drive none of it. The only documented way to test `@gorhom/bottom-sheet` is its shipped mock, and under that mock `BottomSheetModal` always renders its children whatever `present()` or `dismiss()` did, and never calls `onDismiss`. A "does the sheet open" assertion passes whether or not the sheet opens; a test waiting for it to close hangs.

The logic worth protecting already sits below the components and is tested directly. When the component tests were deleted, everything beneath them was covered:

- `lib/workoutProfile` — `buildWorkoutProfile` (23 tests: zone bands, ramps, block widths, minimum widths, the nothing-drawable cases) and `profileCeilingPct` (4). Those are all the arithmetic `WorkoutProfile` has; the rest is `flexGrow` proportions and a zone-to-colour map.
- `lib/upcomingEntries` and `useUpcomingEntries` — which Upcoming Entries the Home list gets, and whether it is hidden, loading, empty or ready.
- `useIntervalsAuth` — connect success, failure, cancel and deny; disconnect confirm and cancel.
- `useIntervalsConnection` — loading, connected, deleted mid-session, listener error.

What the deleted tests added on top was rendering assertions only.

## Considered options

- **Mock the sheet library.** Rejected: the assertions pass vacuously, as above.
- **Render the real sheet under Jest.** Rejected: it needs gesture-handler and Reanimated test setup that the `jest-expo` preset doesn't provide, and the harness still cannot perform a drag.
- **Test components where it's cheap, and skip the sheet.** Rejected: that is the preference-with-exceptions this ADR exists to prevent.

## Consequences

Some rendering behaviour is knowingly untested:

- `WorkoutTile`'s graceful degrade — title and duration only, when a workout has no drawable blocks. `buildWorkoutProfile` proves no blocks are produced; the tile's response is no longer asserted.
- The Home screen's rendering of each Upcoming Entry list state — hidden, loading, empty, and ready with workouts and notes. `useUpcomingEntries` proves which state the list is in; what the screen draws for each is no longer asserted.

A component that grows logic worth testing is the signal to move that logic into `lib/` or `hooks/`, then test it there.
