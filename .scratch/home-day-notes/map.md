# Map: Home Day Notes

## Destination

The Home screen's today/tomorrow section shows intervals.icu day notes (read-only) next to the workout for that day — including days that have a note but no workout — matching what's already visible in the intervals.icu app itself.

## Notes

- Domain: `bh-cycling-app`, an Expo/React Native cycling app already integrated with intervals.icu (OAuth, on-demand REST calls, no server-side caching). See [[project_intervals_integration]] and [[project_workout_tile]] memories for the established architecture and conventions this effort must follow.
- Relevant existing code: [lib/intervalsApi.ts](../../lib/intervalsApi.ts) (typed fetch wrapper + `IntervalsCalendarEvent`), [lib/upcomingWorkouts.ts](../../lib/upcomingWorkouts.ts) (`getUpcomingWorkouts`, currently filters `category === 'WORKOUT'` only), [app/(app)/(tabs)/home/useUpcomingWorkouts.ts](<../../app/(app)/(tabs)/home/useUpcomingWorkouts.ts>) (fetch/state hook), [app/(app)/(tabs)/home/index.tsx](<../../app/(app)/(tabs)/home/index.tsx>) (renders the section).
- Consult `/grilling` and `/domain-modeling` when resolving grilling tickets on this map.
- Skip `/prototype` friction by reusing the existing WorkoutTile card visual language (dark bgSecondary card, borderRadii.lg) as the default starting point, per [[project_workout_tile]] and [[project_home_screen]].

## Decisions so far

- [Research: how intervals.icu exposes day notes via its API](issues/01-research-notes-api-shape.md) — notes are `Event` objects with `category === 'NOTE'` from the same `GET /events` call already used for workouts (no new endpoint/scope/param); text lives in `description` as Markdown; `lib/upcomingWorkouts.ts` is already receiving and silently discarding them today.
- [Grilling: data model for notes in the today/tomorrow section](issues/02-data-model-for-notes-in-section.md) — the section becomes a flat, time-sorted list of `UpcomingEntry` (a `kind: 'workout' | 'note'` union), not a day-grouped structure; notes come from the same call (no new fetch), multiple same-day notes are separate entries, and workout-before-note is an explicit same-day sort tie-break. `getUpcomingWorkouts`/`useUpcomingWorkouts` rename to `getUpcomingEntries`/`useUpcomingEntries`. New terms captured in [CONTEXT.md](../../CONTEXT.md).

## Not yet specified

- Exact empty-state / loading-state copy and i18n keys for the note section — a small detail that falls out naturally once the data-model ticket (below) settles the shape; not sharp enough to ticket yet.

## Out of scope

- **Creating or editing notes from the app** (write-back to intervals.icu) — user confirmed read-only is the goal for this effort; a write flow would be a separate future effort.
- **Showing notes in the Calendar day-view bottom sheet** — user confirmed this effort is Home-only; Calendar note display is a separate future effort.
