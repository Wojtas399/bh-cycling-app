# Research: intervals.icu workout completion status

Issue: #25 (child of #24, "Build Calendar screen: data/state architecture")

Question: How does intervals.icu represent a workout's completion status —
completed, planned (upcoming), or missed (past and not done)?

## Method

Fetched the **live, official** intervals.icu OpenAPI 3.0.1 spec directly from
the source, not a secondhand summary:

```
curl -s "https://intervals.icu/api/v1/docs" -H "Accept: application/json"
```

This URL is what `https://intervals.icu/api/v1/docs/swagger-ui/index.html`
itself loads (traced via its `swagger-initializer.js` → `configUrl` →
`swagger-config`, which resolves to `"url": "/api/v1/docs"`). The
human-readable Swagger UI at `https://intervals.icu/api/v1/docs/swagger-ui/index.html`
renders this same JSON. This is the same spec (cross-checked field-for-field)
as the mirror at `github.com/eddmann/intervals-icu-mcp` (`openapi-spec.json`),
used only for convenience during exploration — all claims below were verified
against the live official response, not the mirror.

Supplementary (secondary, not authoritative) sources: two intervals.icu
community forum threads, cited explicitly where used.

## Finding 1: The `Event` schema has no completion-status field

`GET /api/v1/athlete/{id}/events` (declared in the spec as
`/api/v1/athlete/{id}/events{format}`, `operationId: listEvents`) returns
`Event[]`. The `Event` schema has 60 properties. None of them relate to
completion — there is no `status`, `completed`, `done`, or similar field.
(Verified by listing every `Event` property key and grepping for
`status|complet|done`: zero matches.)

Fields this repo already types on `IntervalsCalendarEvent` (`id`, `category`,
`name`, `start_date_local`, `type`, `workout_doc`) all exist on `Event`.
Notable fields the repo doesn't yet model that are relevant context (not
completion status, but adjacent): `end_date_local`, `moving_time` (planned
duration, present on the _event_, not just derived from `workout_doc`),
`athlete_cannot_edit`, `plan_workout_id` (links back to a training-plan
workout template), and `external_id` (present on events created via
third-party push, e.g. TrainingPeaks).

`category` is an enum: `WORKOUT, RACE_A, RACE_B, RACE_C, NOTE, PLAN, HOLIDAY,
SICK, INJURED, SET_EFTP, FITNESS_DAYS, SEASON_START, TARGET, SET_FITNESS` —
confirming the repo's existing `event.category === 'WORKOUT'` filter
(`lib/upcomingWorkouts.ts`) is filtering against the full known value set,
not a guess.

The `GET /athlete/{id}/events` list endpoint's query parameters are:
`id, format, oldest, newest, category, limit, calendar_id, ext, powerRange,
hrRange, paceRange, locale, resolve`. None of these let you filter or
request completion status either — `resolve` only resolves power/HR/pace
_targets_ to concrete units, unrelated to completion.

**Conclusion: status is not carried directly on the event.** It must be
derived.

## Finding 2: Completion is derived by cross-referencing `Activity.paired_event_id` against `Event.id`

The `Activity` schema (returned by `GET /api/v1/athlete/{id}/activities`)
has a field:

```json
"paired_event_id": { "type": "integer", "format": "int32" }
```

This is an integer, matching the type of `Event.id` (`integer, format:
int32`) — so the match is a **direct id equality**, not a date+type
heuristic: `activity.paired_event_id === event.id`.

This is corroborated by two independent signals:

1. **Forum**: "Paired Event ID" thread
   (https://forum.intervals.icu/t/paired-event-id/40322) — a reply from the
   app's developer (David) states `paired_event_id` on an activity
   "references an event (workout or note etc. on your calendar)." The thread
   notes that once an event is scheduled and paired, the two are "no longer
   synced" going forward (i.e. `paired_event_id` is a one-time link, not a
   live foreign key relationship that keeps details in sync).
2. **Spec behavior**: the spec defines
   `POST /api/v1/athlete/{id}/events/{eventId}/mark-done`
   (`operationId: markEventAsDone`, summary _"Create a manual activity to
   match a planned workout"_), which returns an `Activity`. This is the
   canonical "mark as done" action in the product, and its entire mechanism
   is _creating an Activity paired to the Event_ — there is no endpoint or
   field that flips a boolean on the Event itself. This confirms completion
   is modeled as "an Activity exists and is paired to this Event," not as
   event-side state.

An unresolved, **unanswered** forum question
(https://forum.intervals.icu/t/how-to-check-if-a-calendar-event-is-completed-in-intervals-icu/106140,
posted by a third-party integrator, no staff reply) asks the exact same
question this research ticket asks, and asks specifically whether
`paired_event_id` reliably flips or whether a fallback (matching by
`external_id`, or presumably by date+type) is needed when `paired_event_id`
is absent. **This is a real gap the docs and forum do not close**: it is not
confirmed whether every completed activity that matches a planned workout by
date/type is _reliably_ auto-paired by intervals.icu (setting
`paired_event_id` automatically), or whether auto-pairing only happens in
some cases (e.g. device-recorded rides synced through native
integrations) and not others (e.g. manual uploads, Strava-only syncs). No
endpoint or doc describes intervals.icu's internal auto-pairing algorithm.

**Practical implication for this repo:** primary matching key is
`activity.paired_event_id === event.id`. Because pairing reliability is
unconfirmed for all activity sources, a fallback heuristic (same local date

- matching `type`/sport) may be needed to catch activities intervals.icu
  itself didn't auto-pair — but this should be treated as a best-effort
  fallback, not a guaranteed-correct match, since two same-day same-sport
  activities (e.g. a double ride day) would be ambiguous under a date+type
  match alone.

## Finding 3: Derived status logic (proposed, not an API-provided field)

Given the above, "completed / planned / missed" for a calendar day's
`WORKOUT` event must be computed client-side (or server-side by this app)
by joining `events` and `activities`:

- **Completed**: an `Activity` exists where `paired_event_id === event.id`
  (primary key match), or — as an unconfirmed fallback — an activity on the
  same local date with a matching `type`.
- **Planned (upcoming)**: `event.start_date_local` is today or in the
  future, `category === 'WORKOUT'`, and no matching `Activity` found.
- **Missed**: `event.start_date_local` is strictly in the past,
  `category === 'WORKOUT'`, and no matching `Activity` found.

No document or endpoint returns this tri-state directly; it does not exist
as a field anywhere in the spec.

## Finding 4: Fields not currently modeled that would be needed

On `IntervalsActivity` (`lib/intervalsApi.ts`), to support this derivation
the repo would need to add:

```ts
paired_event_id?: number; // int32, links back to IntervalsCalendarEvent.id
```

Optionally also useful (present on `Activity`, not currently modeled):

- `compliance` (`number`, float) — how closely the activity matched the
  planned target; could support a future "completed but off-target" nuance
  beyond binary completed/missed, though not required for the base
  tripartite status.

On `IntervalsCalendarEvent` (from `Event`), **no new field is needed to
derive status** — there is nothing to add for status itself, since it isn't
present on the schema at all. `end_date_local` and `moving_time` are
available on `Event` if the calendar UI wants a planned-duration display
independent of `workout_doc`, but that's a separate concern from
completion status.

## Fetch/query implication

`GET /athlete/{id}/activities` supports a `fields` query parameter
("Comma separated list of field names to include... also excludes null
values") — so a calendar-day-status fetch could request only
`id,start_date_local,type,paired_event_id` to keep the join cheap, rather
than pulling the full (~150-field) `Activity` object.

## Sources

- Live official OpenAPI spec: `https://intervals.icu/api/v1/docs` (fetched
  with `Accept: application/json`), OpenAPI 3.0.1, `info.title: "Intervals.icu
API"`, `info.version: "v1.0.0"`. Human-readable form at
  `https://intervals.icu/api/v1/docs/swagger-ui/index.html`.
- `https://intervals.icu/api-docs.html` — landing page, links to forum
  threads, no endpoint-level detail itself.
- Forum: "Paired Event ID" —
  https://forum.intervals.icu/t/paired-event-id/40322 (developer reply
  confirming `paired_event_id` semantics).
- Forum: "How to check if a calendar event is completed in Intervals.icu?" —
  https://forum.intervals.icu/t/how-to-check-if-a-calendar-event-is-completed-in-intervals-icu/106140
  (unanswered as of this research; documents the same open question).
- Forum: "Intervals.icu API Integration Cookbook" —
  https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090
  (checked; does not cover completion-status derivation).
- Convenience mirror used only to speed up exploration, cross-checked
  against the live spec above:
  https://github.com/eddmann/intervals-icu-mcp/blob/main/openapi-spec.json
