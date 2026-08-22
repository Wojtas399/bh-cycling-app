# Prototype: how a note renders in the today/tomorrow section

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

How should a day's note actually look and behave in the Home section, next to (or in place of) the WorkoutTile card?

Resolve, informed by [Research: how intervals.icu exposes day notes via its API](01-research-notes-api-shape.md)'s findings on note length/formatting and [Grilling: data model for notes in the today/tomorrow section](02-data-model-for-notes-in-section.md)'s data shape:

- Visual treatment: separate card below the WorkoutTile (as in the intervals.icu screenshot) vs. merged into the tile? Starting point per the map's Notes section is to reuse the existing card language (dark `bgSecondary`, `borderRadii.lg`) rather than invent a new visual style.
- Long notes: full text always shown vs. truncated with expand (tap to open, matching the existing Calendar bottom-sheet pattern) vs. some line-clamp.
- Formatting: does the note's raw text need any parsing/rendering (line breaks, bullet markers, the `!`-bracketed headers seen in the screenshot), or does it render as plain wrapped text for v1?
- Note-only day: what does the card look like when there's a note but no workout that day (no WorkoutTile to sit below)?
- Multiple notes on one day (if Ticket 01 found this possible): stacked cards, or a single combined card?

Build a throwaway prototype via the `/prototype` skill to react to concretely, per the map's HITL/prototype ticket type.

## Answer

A throwaway `/prototype` was built first (three variants — separate/full-text, separate/clamp+expand-sheet, merged/formatted/clamped — behind a dev-only `?notePrototype=1` route param). Before reacting to it in the running app, the user decided to skip the prototype step entirely and go straight to the default the map's Notes section already pointed at ("reuse the existing WorkoutTile card visual language... as the default starting point"), to avoid spending more time on it. The prototype code was deleted; the questions below were answered directly rather than through the prototype:

- **Visual treatment:** separate card below the WorkoutTile, in the same `bgSecondary`/`borderRadii.lg` language — not merged into the tile. Matches the map's stated default and the intervals.icu reference screenshot.
- **Long notes:** full text always shown, no truncation, no expand affordance. Simplest option (Ticket's option 1); avoids building any new sheet/modal UI (the Calendar bottom-sheet pattern referenced in the question doesn't exist in code yet — see Ticket 03's original question — so "matching" it wasn't available as a real reuse anyway).
- **Formatting:** plain wrapped text for v1 — no parsing of `!`-bracketed headers or bullet markers. Matches the map's Notes-section default and keeps the implementation trivial.
- **Note-only day:** the same standalone `NoteCard` renders alone, no WorkoutTile above it — falls out for free from Ticket 02's flat-list model, no special-casing needed.
- **Multiple notes same day:** stacked separate `NoteCard`s, one per entry — falls out for free from Ticket 02's flat-list model.

Implemented directly in [`components/NoteCard.tsx`](../../../components/NoteCard.tsx), wired into [`lib/upcomingEntries.ts`](../../../lib/upcomingEntries.ts) (renamed from `upcomingWorkouts.ts` per Ticket 02) and [`app/(app)/(tabs)/home/index.tsx`](<../../../app/(app)/(tabs)/home/index.tsx>). `IntervalsCalendarEvent` gained a `description?: string` field. Tests updated/added across `lib/__tests__/upcomingEntries.test.ts`, `useUpcomingEntries.test.ts`, `index.test.tsx`, and a new `NoteCard.test.tsx` — all passing.
