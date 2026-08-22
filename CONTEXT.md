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
An Upcoming Entry built from an intervals.icu `Event` with `category === 'NOTE'`. Carries a `title` (the event's `name`) and `text` (the event's `description`, raw Markdown, unrendered at this layer). A day may carry more than one Note Entry — intervals.icu models each note as an independent event, not an array on a day.

**Day Label**:
Which of the two visible days an Upcoming Entry belongs to — `'today'` or `'tomorrow'`. Not a calendar date; purely relative to when the screen is viewed.
