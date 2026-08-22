# Map: Home Day Notes

## Destination

The Home screen's today/tomorrow section shows intervals.icu day notes (read-only) next to the workout for that day — including days that have a note but no workout — matching what's already visible in the intervals.icu app itself.

## Notes

- Domain: `bh-cycling-app`, an Expo/React Native cycling app already integrated with intervals.icu (OAuth, on-demand REST calls, no server-side caching). See [[project_intervals_integration]] and [[project_workout_tile]] memories for the established architecture and conventions this effort must follow.
- Relevant existing code (post-implementation): [lib/intervalsApi.ts](../../lib/intervalsApi.ts) (typed fetch wrapper + `IntervalsCalendarEvent`, now carrying `description`), [lib/upcomingEntries.ts](../../lib/upcomingEntries.ts) (`getUpcomingEntries`, renamed from `getUpcomingWorkouts`), [app/(app)/(tabs)/home/useUpcomingEntries.ts](<../../app/(app)/(tabs)/home/useUpcomingEntries.ts>) (fetch/state hook, renamed from `useUpcomingWorkouts.ts`), [app/(app)/(tabs)/home/index.tsx](<../../app/(app)/(tabs)/home/index.tsx>) (renders the section), [components/NoteCard.tsx](../../components/NoteCard.tsx) (the note card).
- Consult `/grilling` and `/domain-modeling` when resolving grilling tickets on this map.
- Skip `/prototype` friction by reusing the existing WorkoutTile card visual language (dark bgSecondary card, borderRadii.lg) as the default starting point, per [[project_workout_tile]] and [[project_home_screen]].

## Decisions so far

- [Research: how intervals.icu exposes day notes via its API](issues/01-research-notes-api-shape.md) — notes are `Event` objects with `category === 'NOTE'` from the same `GET /events` call already used for workouts (no new endpoint/scope/param); text lives in `description` as Markdown; `lib/upcomingWorkouts.ts` is already receiving and silently discarding them today.
- [Grilling: data model for notes in the today/tomorrow section](issues/02-data-model-for-notes-in-section.md) — the section becomes a flat, time-sorted list of `UpcomingEntry` (a `kind: 'workout' | 'note'` union), not a day-grouped structure; notes come from the same call (no new fetch), multiple same-day notes are separate entries, and workout-before-note is an explicit same-day sort tie-break. `getUpcomingWorkouts`/`useUpcomingWorkouts` rename to `getUpcomingEntries`/`useUpcomingEntries`. New terms captured in [CONTEXT.md](../../CONTEXT.md).
- [Task: confirm NOTE events empirically against a real intervals.icu account](issues/04-confirm-notes-empirically.md) — confirmed live against the user's own account: `GET /events` returns `NOTE`-category events with no extra scope/param (a prior `403` was a malformed athlete-ID typo, not a permissions gate), so no re-authorization is needed for already-connected users; today showed exactly one `NOTE` event, so multiplicity in practice is unobserved but doesn't matter — the flat-list model already handles 0..N.
- [Prototype: how a note renders in the today/tomorrow section](issues/03-note-card-visual-design.md) — user skipped the prototype step to save time and went straight with the map's stated default: a separate `NoteCard` (same `bgSecondary`/`borderRadii.lg` language as WorkoutTile), full text always shown with no truncation, plain wrapped text with no markdown parsing, no special-casing for note-only days or multiple same-day notes (both fall out of Ticket 02's flat-list model for free). Implemented directly in code, not just decided.

## Not yet specified

- Exact empty-state / loading-state copy and i18n keys for the note section — a small detail that falls out naturally once the data-model ticket (below) settles the shape; not sharp enough to ticket yet.

## Out of scope

- **Creating or editing notes from the app** (write-back to intervals.icu) — user confirmed read-only is the goal for this effort; a write flow would be a separate future effort.
- **Showing notes in the Calendar day-view bottom sheet** — user confirmed this effort is Home-only; Calendar note display is a separate future effort.
