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
A Note Entry's `text` rendered for display. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, blockquotes); two families are deliberately degraded because the detail sheet is height-capped and cannot absorb them — images render as their alt text, and tables have their cells stacked as rows. Links render as styled text, not tappable targets: a note is a read-only briefing.
_Avoid_: Note HTML (nothing is converted to HTML), Rich Text (implies an editor)

**Day Label**:
Which of the two visible days an Upcoming Entry belongs to — `'today'` or `'tomorrow'`. Not a calendar date; purely relative to when the screen is viewed.
