# Task: confirm NOTE events empirically against a real intervals.icu account

Type: task
Status: open

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

(pending)
