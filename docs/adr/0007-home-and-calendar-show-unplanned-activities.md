# Home and Calendar list Unplanned Activities, with items on the Activity's day

## Status

Accepted. Supersedes the parts of ADR-0005 that call Home's query "events-only" and say a month stores "its workouts". The rest of ADR-0005 stands.

## Context

The app only showed Workouts. An Activity paired to no Workout, such as a spontaneous Zwift ride, never appeared, so the app's calendar didn't match the athlete's calendar on Intervals.icu (#139). To show those Activities, both queries have to fetch Activities, and Intervals.icu shows a paired Workout and its Activity as one item on the Activity's day.

## Decision

- **Items, not workouts.** A day holds one list of Workouts and Unplanned Activities (`lib/calendarItems.ts`). It is ordered by `start_date_local`, with Workouts first on ties. A paired Workout shows once, on its Activity's day. With several Activities paired to one Workout, the earliest one sets the day. A month stores `itemsByDate` and the completed event IDs. Workout Status is still derived from today at read time.
- **Home fetches Activities.** Home's query, keyed by today, now fetches events and Activities. It derives Workout Status inside the fetch, because `today` is part of its key. Reading the Calendar months instead was rejected for the same reason as in ADR-0005.
- **Both fetches are padded.** Events and Activities are both fetched `PAIRING_WINDOW_DAYS` (7) past each edge of the range. Without it, a Workout planned just outside the range but ridden inside it would be missing. Items whose day falls outside the range are dropped.
- **Unknown pairings show as Unplanned.** An Activity paired to an event that isn't among the fetched Workouts is listed as an Unplanned Activity rather than hidden. That covers a race, or a Workout beyond the window, so the Activity never vanishes.

## Consequences

- A pairing more than 7 days apart that crosses a month edge is seen differently by the two months. The planned month shows the Workout as missed or planned, and the Activity's month shows the Activity as unplanned, so a week spanning both shows two items. This is accepted, like ADR-0005's other window limits.
- An Activity paired to a race shows the "done, not planned" ring, since the app doesn't model races.
- The cross-day placement mirrors how we understand Intervals.icu to behave. If it turns out to differ, only `joinCalendarItems` changes.
