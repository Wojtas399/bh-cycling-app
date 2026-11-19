# Intervals.icu Notes: multi-day semantics and the fields the Calendar needs

Research ticket: #141 (child of map #140, "Notes from Intervals.icu").

This builds on the earlier research
([home-day-notes-api-shape.md](home-day-notes-api-shape.md)),
which settled that Notes are `Event` objects with `category: "NOTE"`, returned by
`GET /api/v1/athlete/{id}/events`, with a Markdown `description`. That is not repeated here.

Each claim is labelled:

- **STATED**: a source says it directly (quoted).
- **INFERRED**: my reading of the sources. No source says it in so many words.
- **LIVE CHECK**: only a real account can settle it.

## Sources

- **[spec]**: the live OpenAPI 3 spec at `https://intervals.icu/api/v1/docs`
  (`info.version` = `v1.0.0`), fetched 2026-10-18. It is the same document that
  `https://intervals.icu/api-docs.html` renders. Used: the `Event` schema and the
  `listEvents` operation (`GET /api/v1/athlete/{id}/events{format}`).
- **[F609]**: david (intervals.icu founder), "API access to Intervals.icu", post #4,
  2020-04-13. <https://forum.intervals.icu/t/api-access-to-intervals-icu/609/4>
- **[F63624]**: david, "Uploading planned workouts to Intervals.icu", 2024-03-29.
  <https://forum.intervals.icu/t/uploading-planned-workouts-to-intervals-icu/63624>
- **[F139]**: david, "Better support for multi-day calendar entries", 2019-12-30 to 2020-01-02.
  <https://forum.intervals.icu/t/better-support-for-multi-day-calendar-entries/139>
- **[F1770]**: david, "Order of Workouts and Notes in Plan", 2020-10-05 and 2022-01-09.
  <https://forum.intervals.icu/t/order-of-workouts-and-notes-in-plan/1770>
- **[F28335]**: david, "Rearrange Notes Order", 2023-01-20.
  <https://forum.intervals.icu/t/rearrange-notes-order/28335>
- **[F7141]**: david, "Time on workouts on the calendar", 2022-02-05.
  <https://forum.intervals.icu/t/time-on-workouts-on-the-calendar/7141>
- **[F625]**: david, "Notes on fitness chart", post #17, 2021-02-22.
  <https://forum.intervals.icu/t/notes-on-fitness-chart/625/17>
- Non-staff context only (not used as evidence on its own): sprouty76,
  <https://forum.intervals.icu/t/notes-or-names-on-week/52883/53> (2025-03-03).

---

## 1. `end_date_local` semantics

### What the spec says

**STATED [spec]:** `"end_date_local": { "type": "string" }`. The spec gives no format, no
description, and no inclusive/exclusive rule. `start_date_local` is typed the same way.

### What staff say

**STATED [F609]:** the values are local datetimes with no timezone, of the form
`yyyy-MM-ddT00:00:00`:

> "note that the dates cannot have time i.e. must end with `T00:00:00`"

**STATED [F609]:** in david's example, a single-day event POSTed with only
`"start_date_local": "2020-05-01T00:00:00"` came back as:

```json
"start_date_local": "2020-05-01T00:00:00",
"end_date_local":   "2020-05-02T00:00:00",
```

So the server fills in `end_date_local` as **start + 1 day at midnight** for a one-day event.
That example is a WORKOUT, not a NOTE.

**STATED [F139]:** multi-day entries use the NOTE category (or HOLIDAY and similar).
Workouts and races are always one day:

> "Workouts and races can only be one day long. So you need to add an entry with category
> "Notes" or "Holiday" etc. and then set the start and end date."

### Answer

- **Type:** a local datetime string with no timezone, `YYYY-MM-DDTHH:mm:ss`. For Notes the
  time part is `T00:00:00`. **STATED [F609]** for the format. Note that workouts have been
  allowed a time of day since 2022 **[F7141]**, so the "must be `T00:00:00`" rule from 2020 no
  longer holds for workouts. Code should parse the date part and should not assume the string
  ends in `T00:00:00`.
- **Inclusive or exclusive:** **exclusive** (a half-open range `[start, end)`). **INFERRED**
  from the [F609] example, where a one-day event has `end = start + 1 day`. If the end were
  inclusive, a one-day event would have `end == start`. No source states the rule in words.
- **Single-day Note:** expect `end_date_local = start_date_local + 1 day`, not null and not
  equal to the start. **INFERRED** for NOTE: the sources only show this for a WORKOUT.
- **Days a Note covers:** every local date `d` with `start_date ≤ d < end_date`, using only
  the date part of each value. **INFERRED.**
- **Defensive handling (recommended):** if `end_date_local` is missing, null, or
  `≤ start_date_local`, treat the Note as covering only its start day.

**LIVE CHECK:** create a 1-day Note and a 3-day Note (e.g. the 10th to the 12th) in the
intervals.icu UI, then GET them. Confirm the values are `end = 11th` and `end = 13th`. Also
check whether a Note created through the API with no `end_date_local` gets one filled in.

---

## 2. Do `oldest`/`newest` return Notes that start before `oldest` but overlap the range?

### What the spec says

**STATED [spec], `listEvents` parameters:**

> `oldest`: "Local date (ISO-8601) for oldest event to return, default is today in the
> athletes timezone"
> `newest`: "Local date (ISO-8601) for newest event to return (inclusive), default is oldest
> plus 6 days"

The spec does not mention multi-day events. It also doesn't say which date the range is
tested against.

### What staff say

**STATED [F609]** (david, from the original description of this endpoint):

> "`GET /api/v1/athlete/{id}/events` List all calendar events. Requires parameters `oldest`
> and `newest` in yyyy-MM-dd format (local dates i.e. no timezone). **The range may be
> expanded if oldest and/or newest fall inside a multiday event to include the whole
> event.**"

### Answer

**Yes.** If `oldest` falls inside a multi-day Note, the server widens the query so the whole
Note comes back. A month query will therefore include a Note that started last month and runs
into this month. The same applies at the `newest` end.

- **STATED** by david [F609]. The post is from 2020, and the current OpenAPI text neither
  repeats nor contradicts it.
- **INFERRED:** a Note that covers the whole range (starts before `oldest` and ends after
  `newest`) is also returned, because `oldest` falls inside it.
- **Consequence for the app:** results can include events whose `start_date_local` is before
  `oldest`. The Calendar must clip each Note to the visible range itself, and must not assume
  that every returned event starts inside the range. A cache keyed by month will see the same
  multi-day Note under each month it touches, so it needs to de-duplicate by `id`.
- **"may be expanded":** the wording is hedged. **LIVE CHECK:** query
  `oldest=<a date in the middle of an existing multi-day Note>` and confirm the Note is in the
  results.

---

## 3. Display fields: `color`, and whether `name`/`description` can be empty

### `color`

**STATED [spec]:** `Event` has `"color": { "type": "string" }`. There is no enum, no format,
and no description.

**STATED [F63624]:** david's own example creates a NOTE with a named color:

```json
{ "category": "NOTE", "start_date_local": "2024-04-01T00:00:00",
  "name": "Build", "description": "Start of build phase", "color": "green", ... }
```

**STATED [F609]:** the response example contains `"color": null`, so color can be null.

**STATED [F139], [F625]:** the UI lets the user choose a Note's color (david: "changed the
colour to red", "give it the swamp colour uses for illness").

**Non-staff [F52883]:** "the colours for notes are constrained to those in the dropdown",
which suggests the UI picker offers a fixed set of named colors.

**Answer:** `color` is an optional string that holds a **named color token** (seen: `green`,
`red`, and "swamp" from david's prose). It is **not documented as hex**. It can be `null`.
**INFERRED:** the full set of values is a fixed palette in the intervals.icu UI, and the API
spec doesn't list it. The app should map known names to its own palette and fall back to a
default for null or unknown values (including any hex value an API client may have written,
since the field is a free string).

**LIVE CHECK:** open the Note color dropdown in the intervals.icu UI, create one Note per
color, and GET them to get the exact token strings (e.g. is the swamp color literally
`"swamp"`?).

### Other display-related fields on `Event` (from [spec])

These are all typed in the spec but **not described**, so their meanings are **INFERRED from
their names**:

- `show_as_note` (boolean): probably shows the event as a note or label on the fitness chart.
  A non-staff answer in the forum (MedTechCD, t/88453) describes a "Show as note" checkbox
  that makes a multi-day event appear by name on the fitness chart. It probably doesn't
  matter for our Calendar.
- `for_week` (boolean): possibly a Note that belongs to a whole week (week-level Note) rather
  than to a day. **LIVE CHECK.** This could affect where the Calendar draws the Note.
- `hide_from_athlete` (boolean): a coach can hide an event from the athlete. **INFERRED:** the
  API probably already leaves these out when the athlete's own token is used. LIVE CHECK if it
  matters.
- `tags` (string array), `attachments` (array), `type` (string): present on every Event. For
  Notes they are probably empty or unused.

### Can `name` or `description` be empty or null?

**STATED [spec]:** the `Event` schema has **no `required` list**, so every field, `name` and
`description` included, is optional in the schema. Both are typed as plain `string` with no
`minLength`.

**STATED [F609]:** nullable fields come back as JSON `null` (e.g. `"color": null`,
`"icu_ftp": null`), not left out.

**Answer (INFERRED):** treat both as possibly `null`, missing, or `""`. Neither the spec nor
staff promise that a Note has a non-empty title or body. Suggested rendering: if `name` is
empty, show the first line of `description`, or a generic "Note" label if that is empty too;
if `description` is empty, show no body.

**LIVE CHECK:** in the UI, try to save a Note with an empty name and one with an empty
description, then see what the API returns (`null` vs `""`).

---

## 4. Ordering of several Notes on one day

### What the spec says

**STATED [spec]:** `Event` has no order or position field. The related fields are `id`
(int32), `start_date_local` (string), `updated` (date-time), and `uid`. `listEvents` doesn't
document the order of its results.

### What staff say

**STATED [F28335]** (david, 2023-01-20, answering "Is there an easy way to order notes"):

> "They are ordered based on creation time more or less."

He suggests a workaround (swap the texts of the two Notes), which confirms that users can't
reorder Notes directly.

**STATED [F1770]** (david, 2022-01-09):

> "For events on the same day there isn't a defined order at present but they will generally
> end up in id (creation order)."

**STATED [F1770]** (david, 2020-10-05): "The most recently created workout will appear first
on the day." This conflicts with the 2022 post. The 2022 post is newer and is the one to
follow.

**STATED [F7141]** (david, 2022-02-05): workouts can now have a time of day, and "If there
are multiple workouts on a day they sort earliest first." This is about workouts. It doesn't
say whether Notes can have a time.

### Answer

- There is **no explicit ordering field**.
- **Recommended sort for Notes on one day:** `start_date_local` first, then `id` ascending.
  For Notes, `start_date_local` is in practice always `T00:00:00`, so `id` decides.
  `id` ascending is approximately creation order, which approximately matches the
  intervals.icu UI. **INFERRED** from [F28335]/[F1770]/[F7141]. david himself only says
  "more or less" and "generally".
- **Side note:** this also confirms that a day can hold **several** NOTE events. david was
  answering a user who had two Notes on one day [F28335]. That closes the open question about
  more than one Note per day from the earlier research. **STATED** (by implication, from the
  question being answered).

**LIVE CHECK (low priority):** create two Notes on the same day and compare the API `id`
order with the order the intervals.icu calendar shows them in.

---

## Summary

| Question                   | Answer                                                                             | Basis                                                  |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `end_date_local` type      | Local datetime string with no TZ, `YYYY-MM-DDT00:00:00`                            | STATED [F609]; spec only says `string`                 |
| inclusive/exclusive        | Exclusive: a Note covers `[start, end)`                                            | INFERRED from [F609] example                           |
| single-day Note            | `end = start + 1 day` (not null, not equal to start)                               | INFERRED (example is a WORKOUT)                        |
| overlap before `oldest`    | Yes: the range is widened to include the whole multi-day event                     | STATED [F609] (2020, "may be")                         |
| `color`                    | Optional string with named tokens (`green`, `red`, ...) or `null`; no enum in spec | STATED [spec], [F63624], [F609]; palette is LIVE CHECK |
| `name`/`description` empty | Possible: no `required` fields, nulls are returned as `null`                       | STATED [spec] schema; empty in practice is INFERRED    |
| ordering                   | No order field; creation order ≈ `id` ascending; workouts sort by time             | STATED [F28335], [F1770], [F7141]                      |
| several Notes per day      | Yes, it happens                                                                    | STATED by implication [F28335]                         |

## Needs a live account

1. 1-day and 3-day Note: exact `end_date_local` values (confirms exclusive end).
2. `oldest` in the middle of a multi-day Note: is the Note returned?
3. The exact `color` token strings offered by the Note color dropdown.
4. A Note with an empty name or description: `null` or `""`?
5. What `for_week` means for a NOTE, and whether week-level Notes exist in the UI.
6. (Low priority) For two Notes on one day: does the UI order match `id` ascending?
