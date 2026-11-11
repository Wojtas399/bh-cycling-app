# Pairing is read from both sides

## Status

Accepted. Supersedes the parts of ADR-0007 that join only on the Activity's `paired_event_id`, and its consequence that a pairing across a month edge shows the Workout as missed or planned in its planned month. The rest of ADR-0007 stands.

## Context

The athlete pairs a Workout to a Strava Activity on Intervals.icu, but the app showed the Workout as missed and the Strava Activity as a separate blank Unplanned Activity (#186). Intervals.icu stores a pairing on both sides: the event's `paired_activity_id` and the Activity's `paired_event_id`. A Strava Activity blanks every field except its id and start time, so its `paired_event_id` is always null. The event side still names it (verified in #184), so the event side covers every pairing.

## Decision

- **Either side pairs.** A Workout and an Activity are paired when the event's `paired_activity_id` names the Activity, or the Activity's `paired_event_id` names the event. The Calendar/Home join and Workout Details apply the same rule. Reading only the event side was rejected: it holds a single id, so it can't express several Activities paired to one Workout, and the union can't regress any existing pairing.
- **The event alone makes a Workout completed.** A Workout whose `paired_activity_id` is set is `completed` even when that Activity is outside the fetched range. It then stays on its planned day, since its Activity's day is unknown.

## Consequences

- A pairing more than 7 days apart that crosses a month edge now shows the Workout as completed on its planned day in that month. The Activity's month may still list the Activity as Unplanned, so a week spanning both months can show both items. ADR-0007 already accepted this double item.
- A Workout completed by a Strava Activity has no metrics to show. What it shows is decided separately.
- **Races pair from the Activity side only.** A Race event never carries `paired_activity_id` (verified in #280), so the either-side rule matches a Race only through the Activity's `paired_event_id`. A Race paired to a Strava Activity can't be seen and shows as an unpaired Race next to a separate Strava Activity. "The event alone makes it completed" doesn't apply to Races. A Race is completed only when an Activity names it, and an unpaired Race has no status, never missed.
