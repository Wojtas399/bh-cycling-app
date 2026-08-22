# Research: how intervals.icu exposes day notes via its API

Type: research
Status: resolved

## Question

How does the intervals.icu REST API represent the per-day notes visible in its own UI (see the "Wzornik Żywienia na zgrupowanie" note in the day card and day-detail sheet)?

Specifically, resolve:

1. Are notes returned as calendar events (e.g. `category === 'NOTE'`) from the same `GET /athlete/{id}/events` endpoint already used by [lib/intervalsApi.ts](../../../lib/intervalsApi.ts)'s `getCalendarEvents`, or via a different endpoint entirely?
2. Which field(s) hold the note's text — `name`, `description`, something else — and what does that text look like (plain string, markdown, HTML)? The screenshot shows multi-line content with headers (`! ODŻYWIANIE PRZED TRENINGIEM: !`) and bullet lists — is that literal text formatting or does intervals.icu apply its own markdown-like rendering?
3. Can a single day carry more than one note? If so, how are multiple notes distinguished/ordered in the API response?
4. Does the existing `oldest`/`newest` date-range query used for the today/tomorrow fetch already return notes alongside workouts, or does fetching notes require an additional call/param?

Use the intervals.icu public API docs (https://forum.intervals.icu/t/api-access-to-intervals-icu/609 and the OpenAPI/Swagger docs it links to) as the primary source; if needed, inspect a live authenticated response against the connected account to confirm field shapes empirically.

## Context

Full findings, with citations: `.scratch/home-day-notes/research/notes-api-shape.md` on branch `research/home-day-notes-api-shape`.

## Answer

**Notes need no new integration — they ride the existing plumbing.** They are plain `Event` objects returned by the same `GET /api/v1/athlete/{id}/events` call `getCalendarEvents` already makes, distinguished only by `category === 'NOTE'` (sibling to `'WORKOUT'` in the documented enum). `lib/upcomingWorkouts.ts:43` is already receiving these events today and silently discarding them via its `.filter(event => event.category === 'WORKOUT')`.

1. **Endpoint:** same one, no new endpoint or required param. An optional `category` filter param exists (`category=WORKOUT,NOTE`) but isn't needed to receive notes — they're already in the unfiltered response.
2. **Text field:** `description` (not `name` — `name` is the short title, e.g. "Wzornik Żywienia na zgrupowanie"). Format is **Markdown**, with some raw HTML passthrough intervals.icu allows for coloring/hiding text (confirmed by a forum reply, not the formal schema — worth a quick empirical spot-check before building the renderer).
3. **Multiplicity:** schema has no `notes: []` array — each note is an independent `Event` object, so two notes on one day would arrive as two separate array entries sharing a `start_date_local`. Whether the intervals.icu UI actually lets a user create two on one day is unconfirmed by docs (open question).
4. **Scope:** no dedicated `NOTES` OAuth scope exists. `CALENDAR:READ` (already requested by this app) almost certainly covers NOTE events too, since they come from the same calendar endpoint — but this is inference, not a documented guarantee, so worth a cheap empirical check against a real token.

**Two open items flagged for empirical (not doc) confirmation**, spun off as [Task: confirm NOTE events under the existing scope](04-confirm-notes-empirically.md) rather than blocking the data-model decision on them, since a safe default (model notes as a list, even if usually 0–1) works regardless of the answer.
