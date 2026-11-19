# Intervals.icu "day notes" — API shape research

Research ticket: how does intervals.icu's public API expose the free-text
day notes seen in their calendar UI (e.g. "Wzornik Żywienia na zgrupowanie"),
and does it fit the calendar-events plumbing this app already has in
`lib/intervalsApi.ts` (`getCalendarEvents`) / `lib/upcomingWorkouts.ts`?

Primary sources consulted:

- **`https://intervals.icu/api-docs.html`** — intervals.icu's own official
  API reference page (RapiDoc UI), listed as "best" in **[Forum #609]** and
  confirmed as the canonical reference. Its page source
  (`<rapi-doc spec-url="https://intervals.icu/api/v1/docs" ...>`) shows it
  is a thin RapiDoc viewer that renders the live OpenAPI 3 JSON spec served
  at `https://intervals.icu/api/v1/docs` — the same spec the Swagger UI at
  `https://intervals.icu/api/v1/docs/swagger-ui/index.html` also renders.
  To quote exact schema/field text verbatim (rather than paraphrase a
  rendered HTML page), the underlying spec JSON was fetched directly.
  Referred to below as **[api-docs.html]** — all `Event`/`listEvents`
  schema and parameter quotes below are the literal content shown on
  `https://intervals.icu/api-docs.html` under the "Events" tag
  (operations `listEvents` — `GET /api/v1/athlete/{id}/events{format}` —
  and `showEvent` — `GET /api/v1/athlete/{id}/events/{eventId}` — plus the
  `Event` schema in the page's Schemas section).
- Forum: [API access to Intervals.icu](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)
  (original announcement thread, post by `david`, 2020-04-01). **[Forum #609]**
- Forum: [Intervals.icu OAuth support](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759)
  (post by `david`, 2021-01-30, edited). **[Forum #2759]**
- Forum: [Formatting support in Notes — line breaks, sections, and structured content](https://forum.intervals.icu/t/formatting-support-in-notes-line-breaks-sections-and-structured-content/129401)
  (2026-05-11). **[Forum #129401]**
- Forum: [See "Notes" in the List view](https://forum.intervals.icu/t/see-notes-in-the-list-view/115923)
  (2025-11-18, post by `davdf`). **[Forum #115923]**

Everything below is taken from these public docs/forum posts. Nothing here
required an authenticated live call, except where explicitly flagged as an
open question.

---

## 1. Are day notes returned via the same `/events` endpoint, or a separate one?

**Same endpoint. There is no separate notes endpoint.**

The `GET /api/v1/athlete/{id}/events{format}` operation (the same one this
app's `getCalendarEvents` already calls, mapped by `intervalsCalendarEventsPath`)
is documented in the spec as:

> summary: "List events (planned workouts, notes etc.) on the athlete's
> calendar, add .csv for CSV output" — operationId `listEvents`
> **[api-docs.html]**

The single event/note fetch endpoint is the same shape:

> `GET /api/v1/athlete/{id}/events/{eventId}` — summary: "Get an event
> (planned workout, note etc.)" — operationId `showEvent` **[api-docs.html]**

Notes are simply `Event` objects with `category: "NOTE"`. The `Event`
schema's `category` enum, taken verbatim from the spec, is:

```
"category": {
  "type": "string",
  "enum": [
    "WORKOUT", "RACE_A", "RACE_B", "RACE_C", "NOTE", "PLAN", "HOLIDAY",
    "SICK", "INJURED", "SET_EFTP", "FITNESS_DAYS", "SEASON_START",
    "TARGET", "SET_FITNESS"
  ]
}
```

**[api-docs.html]**

So the answer to Q1 is: **the same `GET /api/v1/athlete/{id}/events`
endpoint, filtered/identified by `category === 'NOTE'`** — exactly the
pattern this app already uses for `category === 'WORKOUT'` in
`lib/upcomingWorkouts.ts`.

---

## 2. Which field holds the note text, and is it plain/markdown/HTML?

**`description`** is the field. `name` is a separate, presumably short
title field (used for e.g. "Wzornik Żywienia na zgrupowanie" in the user's
example).

From the `Event` schema:

```
"name": { "type": "string" },
"description": { "type": "string" }
```

**[api-docs.html]** — the spec only types these as plain strings; it does
not annotate a content format at the schema level.

Corroborating evidence that `description` is the free-text/body field (not
just for workouts): the `createEvent`/`createMultipleEvents` operations
say:

> "This endpoint accepts workouts in native Intervals.icu format
> ('description' field) as well as zwo, mrc, erg and fit files (use
> 'file_contents' or 'file_contents_base64')" **[api-docs.html]**

**Format: Markdown**, confirmed by an intervals.icu community member (not
staff, but directly answering a question about the Notes API) in
**[Forum #129401]**. A user (`ilan_ulman`) asked in May 2026 whether Notes
support any formatting, since plain text via the API rendered as one
unbroken block. Reply from `R2Tom` (2026-05-11):

> "You can use markdown, and some markup for coloring:" — followed by an
> example using `##`/`####` headers, a markdown table, `---` horizontal
> rules, a markdown link, numbered lists with `**bold**`/`*italic*`, and
> raw HTML `<span class="text-red">`/`<span class="d-none">` for color and
> hidden text. **[Forum #129401]**

So in practice the `description` field is **Markdown, with some raw HTML
passthrough allowed** for things CSS/markdown alone can't do (color,
hiding text). The original poster in that same thread reported that
line breaks/formatting weren't rendering for them when sending plain text —
implying the field is markdown-interpreted (so plain newlines alone don't
create visual breaks; you need markdown syntax).

Note: the OpenAPI spec itself never states "this field is markdown" —
that fact comes only from the forum, not from a formal schema annotation.
Flagging this as **confirmed by a knowledgeable third-party forum reply,
not by intervals.icu's own written docs** — worth a quick empirical check
(fetch a real NOTE event via this app's existing token and see what raw
markdown/HTML the `description` contains) before building a renderer.

---

## 3. Can a single day carry more than one note? How would that appear?

**The schema has no array-of-notes field.** Each note is an independent
`Event` object (its own `id`, `uid`, etc.) with `category: "NOTE"` and a
`start_date_local` (there's also an `end_date_local` field on `Event`,
used for multi-_day_ notes spanning a date range — a different concept
from multiple notes _on_ one day). **[api-docs.html]**

This means: if a day has two separate notes, a list response from
`GET /events` would contain **two separate objects in the returned
array**, both with `category === 'NOTE'` and the same (or overlapping)
`start_date_local`, not one object with an array field. This follows
directly from the flat `Event` schema — there is no `notes: []` sub-field
anywhere in the spec.

I could not find explicit doc/forum confirmation that the intervals.icu UI
_allows_ creating two independent notes on the same calendar day (as
opposed to one note whose body has multiple sections, which is what the
user's nutrition-plan example and the "Formatting support" thread describe
— people seem to work around a one-note-per-day mental model by using
markdown headers to create sections within a single note). The closest
related discussion, **[Forum #115923]** (`davdf`, 2025-11-18), talks about
notes being "held at the Day level" in the context of the List view
showing one Notes/Comments column per day, which is consistent with (but
doesn't prove or disprove) a one-note-per-day UI convention.

**Open question for empirical confirmation:** whether the intervals.icu
calendar UI actually lets a user attach more than one NOTE-category event
to the same `start_date_local`. The API schema would support it (nothing
stops two Event objects sharing a date), but this needs a live-account
check, not just doc reading.

---

## 4. Does the existing `oldest`/`newest` date-range query already return notes, or is a separate call/param needed?

**Yes — the existing `oldest`/`newest` call already returns NOTE-category
events, no separate call needed.** There is an _optional_ `category`
query parameter you could add as a server-side filter, but it is not
required to receive notes.

From the `listEvents` operation parameters, verbatim:

```
oldest: "Local date (ISO-8601) for oldest event to return, default is
         today in the athletes timezone"
newest: "Local date (ISO-8601) for newest event to return (inclusive),
         default is oldest plus 6 days"
category: "Comma separated list of categories to filter for
           (e.g. WORKOUT,NOTES)"   <- optional, array of strings
```

**[api-docs.html]**

(Note the example in the param description literally says `WORKOUT,NOTES`
— plural "NOTES" in the example text, but the actual enum value on the
`Event.category` field is singular `"NOTE"` — see Q1. Worth being careful
here: use `NOTE` singular when filtering, matching the schema enum, not
the doc-string example's typo/plural.)

Since `category` is optional and absent means "no filter" (all
categories), this app's current call to `getCalendarEvents(token, athleteId, { oldest, newest })`
already receives NOTE events mixed in with WORKOUT and everything else in
the same array — they're just being silently dropped today by the
`.filter(event => event.category === 'WORKOUT')` line in
`lib/upcomingWorkouts.ts:43`. **No new endpoint or required extra param is
needed** — the data-model change is purely about not discarding
`category === 'NOTE'` events and mapping their `name`/`description` fields,
plus (optionally) passing `category=WORKOUT,NOTE` to trim payload size if
desired.

---

## 5. Any auth/scope implications versus the app's current `ACTIVITY:READ,CALENDAR:READ`?

**No separate scope appears to exist for notes; `CALENDAR:READ` (already
requested) is almost certainly sufficient** — but this is an inference
from how scopes and endpoints are named, not a doc sentence that says
"notes require CALENDAR:READ" explicitly, so it's flagged for a quick
empirical check.

The full scope list, verbatim from **[Forum #2759]** (`david`,
2021-01-30):

> Scopes are as follows:
>
> - ACTIVITY: Completed rides, runs etc.
> - WELLNESS: Weight, resting HR etc.
> - CALENDAR: Planned workouts
> - CHATS: Chats, groups and messages
> - LIBRARY: Workout library
> - SETTINGS: Athlete settings
>
> For each scope specify READ or WRITE (to update, implies READ access)
> and use commas to separate multiple scopes.

There is no `NOTES` scope in this list, and the OpenAPI spec's
`securitySchemes` section only defines two auth mechanisms (`APIKey` via
HTTP Basic, `AccessToken` via HTTP Bearer) — it does not encode
per-endpoint OAuth2 scope requirements at all (no `security` scope arrays
per-operation, just a blanket top-level `security: [{APIKey: [], AccessToken: []}]`).
**[api-docs.html]**

Reasoning for why `CALENDAR:READ` should cover NOTE events: the `/events`
endpoint (which serves both WORKOUT and NOTE category objects) is
explicitly described in its own summary as listing events "on the
athlete's calendar" **[api-docs.html]**, and the CALENDAR scope's one-line
description ("Planned workouts") is a summary/example rather than an
exhaustive list of every category gated by it — WORKOUT, NOTE, RACE\_\*,
HOLIDAY, TARGET etc. all live on the same calendar and are fetched through
the same scope-gated endpoint. Since this app already requests
`ACTIVITY:READ,CALENDAR:READ` (`hooks/useIntervalsAuth.ts:15`) and already
successfully reads WORKOUT-category events under `CALENDAR:READ` today,
NOTE-category events from the identical endpoint should work under the
same grant with no re-authorization needed for existing users.

**Open question for empirical confirmation:** actually calling
`GET /events` with `category=NOTE` (or unfiltered) using this app's
existing stored access token/scope and confirming the response includes
NOTE events with a 200 (not a 403/permission error). This is a cheap,
low-risk check to do against a real dev account before shipping, since
the doc evidence, while consistent, is inferential rather than a literal
"NOTE requires CALENDAR:READ" statement.

---

## Summary for follow-up scoping

The most important finding: **no new endpoint, no new OAuth scope, and no
required new query param are needed.** Day notes are just `Event` objects
with `category: "NOTE"` returned by the exact same
`GET /api/v1/athlete/{id}/events` call (`getCalendarEvents` in
`lib/intervalsApi.ts`) this app already makes for workouts, gated by the
`CALENDAR:READ` scope already requested. The follow-up ticket's data-model
change is scoped to:

1. Extending `IntervalsCalendarEvent`'s typed shape (in
   `lib/intervalsApi.ts`) to include `description?: string` alongside the
   existing `name`, or introducing a narrower type for NOTE events.
2. Not filtering out `category === 'NOTE'` in `lib/upcomingWorkouts.ts`
   (or a new sibling module) the way it currently filters everything down
   to `category === 'WORKOUT'`.
3. Rendering `description` as Markdown (with the caveat that intervals.icu
   also permits some raw HTML passthrough, per **[Forum #129401]**) rather
   than plain text.
4. Empirically confirming (open questions above): (a) whether
   `CALENDAR:READ` truly permits reading NOTE events for a real token, and
   (b) whether a day can carry more than one NOTE event in practice, before
   finalizing the UI's one-note-per-day vs. list-of-notes-per-day
   assumption.
