# bh-cycling-app

An Expo/React Native cycling app that surfaces a rider's intervals.icu schedule on-device, via on-demand REST calls (no server-side caching).

**Mobile only — no web target.** Firebase is initialized natively only (no `initializeApp()` call for web); loading the app via `expo start --web` crashes immediately with `No Firebase App '[DEFAULT]' has been created`. Verify UI changes on the iOS Simulator or a device, not a browser preview.

## Language

**Upcoming Entry**:
One item in the Home screen's today/tomorrow list — either a Workout Entry or a Note Entry, discriminated by `kind`. Sourced from a single intervals.icu calendar event each; the list is a flat, time-sorted sequence, never grouped by day.
_Avoid_: Upcoming Workout (implies every entry has a workout)

**Workout Entry**:
An Upcoming Entry built from an intervals.icu `Event` with `category === 'WORKOUT'`. Carries the workout's title, duration, and Workout Profile.

**Note Entry**:
An Upcoming Entry built from an intervals.icu `Event` with `category === 'NOTE'`. Carries a `title` (the event's `name`) and `text` (the event's `description`, raw Markdown — carried unparsed through the data layer and rendered only at the view, by Note Markdown). A day may carry more than one Note Entry — intervals.icu models each note as an independent event, not an array on a day.

**Note Markdown**:
A Note Entry's `text` rendered for display. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, blockquotes); two families are deliberately degraded — images render as their alt text, and tables have their cells stacked as rows — because a phone's width, not the sheet's height, cannot fit a table, and a note is a read-only briefing rather than a document viewer. Links render as styled text, not tappable targets, for the same reason.
_Avoid_: Note HTML (nothing is converted to HTML), Rich Text (implies an editor)

**Sheet**:
The shared shell every bottom sheet in the app is built on: backdrop, rounded top corners, grab handle, safe-area padding, full height, and theming. Deliberately not a header — each caller writes its own.

**Note Detail Sheet**:
A Sheet showing a Note Entry's full Note Markdown. Opened from the Upcoming Entry list, which shows a note's title only. It is always full height, minus the top safe-area inset — the backdrop survives only as a thin strip at the top, and dismissal is by drag-down, the close X, or that strip. It covers the whole screen, tab navigation included, so a note is read as an interruption and left by dismissing it — never by navigating past it — and this is now the reason the bottom-sheet providers sit at the app's root rather than inside a tab screen.

**Day Label**:
Which of the two visible days an Upcoming Entry belongs to — `'today'` or `'tomorrow'`. Not a calendar date; purely relative to when the screen is viewed.
