# Prototype: how a note renders in the today/tomorrow section

Type: prototype
Status: claimed
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
