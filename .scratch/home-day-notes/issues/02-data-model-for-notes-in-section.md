# Grilling: data model for notes in the today/tomorrow section

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given what [Research: how intervals.icu exposes day notes via its API](01-research-notes-api-shape.md) finds about the API shape, decide how `lib/upcomingWorkouts.ts` and `app/(app)/(tabs)/home/useUpcomingWorkouts.ts` change to include notes:

- Does `getUpcomingWorkouts` grow a `note` (or `notes`) field per day, or does the section move to a new shape entirely (e.g. a list of day entries, each optionally carrying a workout and/or a note)?
- How is a note-only day (no workout event that day) represented and sorted relative to days that do have a workout, given the section must now show it per the agreed destination?
- If a day can carry multiple notes (per Ticket 01's finding), how are they modeled — array on the entry, or one entry per note?
- Does fetching notes change the existing `getCalendarEvents` call/params, or is it a second call? What does that mean for the current `Promise.all` in `useUpcomingWorkouts.ts` and its zone-settings-optional error handling pattern?
- Any auth/error-handling implications reusing the existing `IntervalsAuthError` / `handleIntervalsAuthError` pattern, or does it carry over unchanged?

Consult `/grilling` and `/domain-modeling`.

## Answer

The section moves from a flat list of workout-only entries to a flat list of **Upcoming Entries** — a discriminated union of **Workout Entry** and **Note Entry** — sorted the same way the list is sorted today, with no day-grouping step introduced. See [CONTEXT.md](../../../CONTEXT.md) for the resolved terms.

1. **Shape**: `getUpcomingWorkouts` (renamed `getUpcomingEntries`) stops filtering out `category === 'NOTE'` events and instead maps every event (WORKOUT or NOTE) into an `UpcomingEntry`, discriminated by `kind: 'workout' | 'note'`. No new grouping/merge step — the existing code already doesn't group by day (two same-day workouts already render as two separate tiles in event order), so this generalizes cleanly rather than requiring a rewrite.

   ```ts
   type UpcomingEntry = UpcomingWorkoutEntry | UpcomingNoteEntry;

   interface UpcomingWorkoutEntry {
     kind: 'workout';
     id: number;
     name: string;
     dayLabel: 'today' | 'tomorrow';
     durationSeconds?: number;
     blocks: WorkoutBlock[];
   }

   interface UpcomingNoteEntry {
     kind: 'note';
     id: number;
     title: string; // event.name
     text: string; // event.description, raw Markdown, unrendered here
     dayLabel: 'today' | 'tomorrow';
   }
   ```

   `IntervalsCalendarEvent` (`lib/intervalsApi.ts`) needs a `description?: string` field added to carry the note body through — it's the source for `text` above and doesn't exist on the type today.

2. **Note-only day**: represented for free by the union — it's just an `UpcomingNoteEntry` with no companion workout entry, same `dayLabel` mechanics as today. No special-casing needed in the data layer; the Home screen just renders whatever `kind` each entry is.

3. **Multiple notes per day**: modeled as separate `UpcomingNoteEntry` items in the flat list, not an array field. Matches Ticket 01's finding that intervals.icu has no `notes: []` bundle — each note is its own `Event`, so each becomes its own entry, same as a second same-day workout already would.

4. **Fetch/call shape**: unchanged. Same single `getCalendarEvents` call, same `Promise.all` in `useUpcomingWorkouts.ts` (renamed `useUpcomingEntries.ts`) with the zone-settings-optional `.catch(() => null)` pattern intact — only the mapping logic inside `getUpcomingEntries` changes (route by `category` into the union instead of filtering `NOTE` out).

5. **Auth/error handling**: `IntervalsAuthError` / `handleIntervalsAuthError` carry over completely unchanged — same underlying request, no new failure mode introduced.

6. **Sort order**: primary key stays `start_date_local`-implied date (today before tomorrow); within the same date, an explicit secondary rule — workout entries sort before note entries — overrides raw `start_date_local` comparison, since intervals.icu's own timestamp on a NOTE event (e.g. defaulting to midnight) isn't a reliable proxy for "should this appear above or below the workout." This matches the reference UI (note sits below the workout).

7. **Naming**: `UpcomingWorkout` → `UpcomingEntry` (union above), `getUpcomingWorkouts` → `getUpcomingEntries`, `useUpcomingWorkouts` → `useUpcomingEntries`, propagating into `home/index.tsx`'s render loop (switches on `entry.kind` to render `WorkoutTile` vs. the future note card from Ticket 03).

No ADR: none of these decisions are hard to reverse, architecturally surprising, or the result of a lock-in trade-off — captured as domain vocabulary in [CONTEXT.md](../../../CONTEXT.md) instead.
