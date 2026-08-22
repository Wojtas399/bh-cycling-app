# Task: confirm NOTE events empirically against a real intervals.icu account

Type: task
Status: resolved

## Question

[Research: how intervals.icu exposes day notes via its API](01-research-notes-api-shape.md) settled the shape from docs alone, but flagged two things only a live account can confirm:

1. Does `GET /api/v1/athlete/{id}/events` actually return `category === 'NOTE'` events for a token scoped only `ACTIVITY:READ,CALENDAR:READ` (this app's current OAuth grant) — i.e. no re-authorization needed for already-connected users?
2. Can a single day in practice carry more than one independent NOTE event (as opposed to one note with multiple markdown sections)?

This doesn't block [Grilling: data model for notes in the today/tomorrow section](02-data-model-for-notes-in-section.md) — model notes as a list per day regardless (works whether the answer is 0, 1, or N) — but should be confirmed before shipping, and may sharpen the UI decision in [Prototype: how a note renders in the today/tomorrow section](03-note-card-visual-design.md).

**How to check:** with your existing connected intervals.icu account (or a personal API key from intervals.icu Settings → API Access), call:

```bash
curl -s "https://intervals.icu/api/v1/athlete/{id}/events?oldest=<today>&newest=<today>" \
  -u "API_KEY:<your key>" | jq '[.[] | select(.category=="NOTE")]'
```

Confirm it returns 200 with your existing token/scope, and check whether any day of yours currently has 2+ NOTE events to settle the multiplicity question.

## Answer

Confirmed empirically against the user's own live account (`i249400`).

1. **Scope/access:** `GET /api/v1/athlete/i249400/events?oldest=...&newest=...` returned `200` and a `NOTE`-category event with no special param or additional scope — same call shape the app already makes. The only failure hit along the way was a malformed athlete ID (`249400` instead of `i249400`), which produced a `403 {"status":403,"error":"Access denied"}`; that's an ID-format issue, not a permissions/scope gate on notes. Since intervals.icu applies access control at the calendar/events level (confirmed by Ticket 01: no dedicated `NOTES` OAuth scope exists) and this app's existing `CALENDAR:READ` grant already successfully calls this same endpoint for `WORKOUT` events today, **no re-authorization is needed for already-connected users** to also receive `NOTE` events. (Caveat: the live test used a personal API key rather than pulling this app's actual stored OAuth token — intervals.icu's permission model is per-athlete rather than per-scope for personal keys, so this isn't a byte-for-byte replication of the app's OAuth path, but it corroborates Ticket 01's scope reasoning with a real response instead of docs alone.)

2. **Multiplicity:** today (2026-08-22) has exactly **one** `NOTE` event. The quick check didn't surface a day with 2+, so multiplicity-in-practice for this account remains unobserved — but this doesn't block anything: Ticket 02 already modeled notes as independent flat-list entries (0..N per day), which handles any multiplicity without change if it's ever encountered.

Sample response confirms the earlier research: `description` carries Markdown/emoji-formatted free text (e.g. `❗️ODŻYWIANIE PRZED TRENINGIEM:❗️` headers, `-` bullet lists), `name` is the short title, and the object is a full `Event` record with dozens of workout-only fields set to `null` — nothing new needed in the mapping beyond what Ticket 02 already specified.
