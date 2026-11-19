# What test options does the Intervals.icu API offer?

Research for [#113](https://github.com/Wojtas399/bh-cycling-app/issues/113) (map [#108](https://github.com/Wojtas399/bh-cycling-app/issues/108), e2e testing spec). Researched 2026-10-15.

## TL;DR

- **No sandbox or test-athlete mechanism exists.** Neither the OpenAPI spec nor the developer's forum guides mention one. A "test athlete" is just an ordinary (free) Intervals.icu account that we register ourselves. The API has no account-creation endpoint.
- **There are exactly two auth schemes.** One is a personal **API key** over HTTP Basic (`API_KEY:<key>`). The other is an **OAuth bearer token**. No other personal access token exists. The app only ever sends `Authorization: Bearer <token>`, so an API key **cannot** be dropped into the app's Firestore doc unchanged.
- **A non-interactive path for the app does exist.** Do the OAuth consent **once, by hand**, for a dedicated test athlete, then reuse that bearer token. Tokens have no refresh flow and no documented expiry. Since Oct 2023 each authorisation mints an _additional_ token rather than replacing the old one. Seed the token into `users/{uid}/integrations/intervals` for the test user.
- **Workouts can be seeded through the API** with `POST /api/v1/athlete/{id}/events` or `/events/bulk` (category `WORKOUT`, workout text in `description`). Cleanup is `DELETE /events?oldest=…&category=WORKOUT` or `PUT /events/bulk-delete`. Writes need `CALENDAR:WRITE`, which the app's token lacks (it asks for READ only). So seed with the test athlete's **API key**, or with a separate write-scoped token.
- **Limits:**
  - API key: 5,000 requests/day and 2,500 per rolling 15 min. OAuth apps get a separate per-app budget, at least 5,000/day.
  - Every caller: 10 requests/s per IP. Going over returns HTTP 429 with `Retry-After`.
  - Terms: no clause forbids test or automated traffic, only "Do not abuse the API".

## 1. What the app calls today (repo inspection)

| Caller                                                                                       | Method + URL                                                                                                                                                              | Auth                                                      | Purpose                                                |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `hooks/useIntervalsAuth.ts`                                                                  | Browser → `https://intervals.icu/oauth/authorize` (`response_type=code`, scope `ACTIVITY:READ,CALENDAR:READ`, redirect `blackhorsecyclingapp://oauth/intervals`, no PKCE) | –                                                         | Interactive consent (expo-auth-session)                |
| `functions/src/intervals/exchangeToken.ts` (callable `exchangeIntervalsToken`)               | `POST https://intervals.icu/api/oauth/token` (form: `client_id`, `client_secret`, `code`)                                                                                 | Client secret (Firebase secret `INTERVALS_CLIENT_SECRET`) | Code → access token                                    |
| `lib/intervalsApi.ts` `getAthleteSettings`                                                   | `GET /api/v1/athlete/0`                                                                                                                                                   | `Bearer`                                                  | Athlete settings / power zones (`0` = token's athlete) |
| `lib/intervalsApi.ts` `getActivities`                                                        | `GET /api/v1/athlete/{athleteId}/activities?oldest&newest&fields`                                                                                                         | `Bearer`                                                  | Completed Activities (pairing via `paired_event_id`)   |
| `lib/intervalsApi.ts` `getCalendarEvents`                                                    | `GET /api/v1/athlete/{athleteId}/events?oldest&newest`                                                                                                                    | `Bearer`                                                  | Planned Workouts (`workout_doc.steps`)                 |
| `functions/src/intervals/revokeToken.ts` (used by `disconnectIntervals` and `deleteAccount`) | `DELETE https://intervals.icu/api/v1/disconnect-app`                                                                                                                      | `Bearer`                                                  | Revoke on disconnect / account deletion                |

Base URL: `INTERVALS_API_BASE_URL = 'https://intervals.icu/api/v1'` in `lib/intervalsApiPaths.ts`. It is a hard-coded constant, so there is currently no seam for pointing the app at a mock server.

**Token storage and use**

- The Cloud Function writes `{ accessToken, athleteId, athleteName, scope, connectedAt }` to Firestore `users/{uid}/integrations/intervals` (`functions/src/intervals/types.ts`).
- `firestore.rules` lets the owner read that doc. Client writes are denied (`allow write: if false`), so only the Admin SDK can seed it.
- `hooks/useIntervalsConnection.ts` subscribes to the doc. The client then calls the API directly with `Authorization: Bearer ${accessToken}`. A 401 throws `IntervalsAuthError`, which drives the "needs reconnect" state.

## 2. Authentication options

**API key (personal):**

- You generate it at the bottom of `/settings` ("Developer Settings").
- Usage is `curl -u API_KEY:<your key> https://intervals.icu/api/v1/athlete/<id>/activities.csv`.
- It is meant for access to your own data. _Source: [API access to Intervals.icu](https://forum.intervals.icu/t/api-access-to-intervals-icu/609), first post by the developer (david)._

**The OpenAPI spec defines exactly two security schemes:**

- `APIKey`: `type: http, scheme: basic`, "Username is API_KEY, Password is your API key found in /settings".
- `AccessToken`: `type: http, scheme: bearer`, "Use bearer token for an athlete from OAuth flow".
- _Source: OpenAPI 3.0.1 spec served at <https://intervals.icu/api/v1/docs>, `components.securitySchemes`._
- So there is **no "personal access token" usable as a Bearer.** The [Intervals.icu FAQ](https://forum.intervals.icu/t/intervals-icu-faq/123707/4) also stresses "Basic, not Bearer" for keys.

**OAuth:**

- Flow: authorize → `code` → `POST /api/oauth/token` within 2 minutes → `access_token`, `scope`, `athlete {id, name}`. Revocation is `DELETE /api/v1/disconnect-app`. _Source: [Intervals.icu OAuth support](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759), first post (david)._
- **No refresh tokens:** "it doesn't use refresh tokens, only access tokens" (david, 7 Sep 2021, same thread).
- No expiry is documented. One integrator reports they "never had to re-login" (app4g, 30 Aug 2022). That is anecdotal, not official.
- **Multiple tokens per athlete per app:**
  - 2022 behaviour: "this replaces whatever token might already exist" ([david, 15 Feb 2022](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/14)).
  - Superseded behaviour: "There can be many access tokens for an athlete linked to an app, once for each time they authorise it. The most recent scopes apply to all access tokens." ([david, 1 Oct 2023](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759?page=2)).
  - So a developer re-connecting the test athlete on a phone no longer kills the CI token.
  - **Caveat:** "the most recent scopes apply to all", so re-authorising with fewer scopes downgrades the CI token as well.
- **Revocation risk for e2e:** the spec summary of `DELETE /disconnect-app` is "Disconnect the athlete from the app matching the bearer token".
  - The app calls it from both `disconnectIntervals` and `deleteAccount`.
  - Running those journeys against a real seeded token would most likely disconnect the test athlete from the app, i.e. revoke the CI token. Treat that as "assume all tokens die".
  - So those journeys need a stubbed revoke (e.g. emulator Functions) or a throwaway token per run.
- `GET /api/v1/athletes` "cannot be called with a bearer token, an API_KEY is required" (spec). The app doesn't use it. It only shows that the two schemes don't cover the same endpoints.

**App registration:**

- You apply at `/oauth/apply` as the owning athlete. "you will not be able to do the OAuth flow until it is approved".
- Unlisted apps are invisible to others, but you can still send any athlete to the consent page. _Source: OAuth support thread, first post._
- The existing approved client can therefore authorise a test athlete. No second app is needed.

**Test / sandbox accounts:**

- Not mentioned in the spec, the [API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090), the OAuth thread or the API-access thread.
- The spec's 117 paths include no account-creation endpoint. A club admin asking for programmatic provisioning notes "there only seem to be POST endpoints within an existing athlete" ([forum, Jul 2026](https://forum.intervals.icu/t/provisioning-intervals-accounts-for-a-clubs-athletes-minimal-athlete-friction/130761)).
- The test athlete must be registered by hand, once.

## 3. Seeding Workouts (and Activities) on a test athlete

All of the following are from the OpenAPI spec unless noted.

**Create:**

- `POST /api/v1/athlete/{id}/events` (single) or `POST /api/v1/athlete/{id}/events/bulk` (array).
- These accept "workouts in native Intervals.icu format ('description' field) as well as zwo, mrc, erg and fit files (use 'file_contents' or 'file_contents_base64')".
- The developer's guide example is `[{ "category": "WORKOUT", "start_date_local": "2024-03-30T00:00:00", "filename": "...fit", "file_contents_base64": "...", "external_id": "1234" }]`, and `{id}` "can be zero to use athlete associated with the bearer token or API key". _Source: [Uploading planned workouts to Intervals.icu](https://forum.intervals.icu/t/uploading-planned-workouts-to-intervals-icu/63624) (david, 29 Mar 2024)._
- **The guide states that `CALENDAR:WRITE` is required**, and the app's token is READ-only.

**Steps:**

- The app renders `workout_doc.steps`. Steps are parsed from the `description` workout text (with `type: "Ride"`). A separate `steps` array in the request is _not_ used ([forum, Dec 2025](https://forum.intervals.icu/t/uploading-json-cannot-get-steps-to-be-generated/117959), community answer).
- Uploading a `.zwo`/`.fit` file is the more deterministic route.
- Either way, verify the returned `workout_doc` once when writing the fixture.

**Idempotent upsert:**

- `?upsert=true` on `/events/bulk` "Update events with matching external_id and created by the same OAuth application".
- `external_id` matching therefore only works for **OAuth-app** callers. With an API key, use `uid` (`upsertOnUid`) or delete-then-create.

**Cleanup:**

- `DELETE /api/v1/athlete/{id}/events?oldest=YYYY-MM-DD[&newest]&category=WORKOUT[&createdById]` deletes a date range. With no `newest` it deletes all future events.
- Or use `PUT /api/v1/athlete/{id}/events/bulk-delete` by `id`/`external_id`, where "Events that do not exist are ignored".

**Activities, for Workout Status (completed/missed):**

- `POST /api/v1/athlete/{id}/activities/manual` and `/activities/manual/bulk` ("upsert on external_id", same OAuth-app restriction).
- Or `POST /api/v1/athlete/{id}/activities` (multipart FIT/TCX/GPX), which takes a `paired_event_id` query param, "Workout to pair with activity". This is exactly what the app joins on.
- These need `ACTIVITY:WRITE` (scope list in the OAuth thread). Uploads are de-duplicated by file hash.

**Also note:**

- `GET /activities` "An empty stub object is returned for Strava activities", and Strava data is excluded from the API (API-access thread). The test athlete must not get its data from Strava sync.
- The spec marks some query params as `required: true` (e.g. `upsertOnUid`, `updatePlanApplied`, `category` on GET events). The guide shows them as optional. Treat the spec's "required" flags as unreliable.

## 4. Rate limits and terms

_Source for limits: [API access to Intervals.icu](https://forum.intervals.icu/t/api-access-to-intervals-icu/609), first post (david)._

**Rate limits:**

- **API key:** "limited to 5000 requests per day and 2500 requests per rolling 15 minute window". Resets at midnight UTC.
- **OAuth apps:** default 100 requests/day per user, total capped at 50,000, minimum 5,000/day. The 15-min window is 1/8 of daily, minimum 2,500. Usage is visible under "Manage App" at `/settings/apps`.
- **Every caller:** 10 req/s per IP, which sends no rate-limit headers. Over-limit returns **HTTP 429 + `Retry-After`** (seconds).
- A smoke suite makes roughly 3 GETs per screen load, so it is orders of magnitude below these limits. Seeding/cleanup should still be bulk calls, with a 429 retry.

**Other gotchas:**

- Cloudflare may challenge some HTTP client user agents (e.g. Python-urllib). "The easy fix is to change the user agent to look like a browser" (same post). That's relevant for CI seeding scripts.
- The app has no 429 handling: `lib/intervalsApi.ts` maps any non-OK to `IntervalsApiError`.

**Terms ([Intervals.icu API Terms and Conditions](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087), david, effective 23 Oct 2025):**

- "Comply with all applicable laws", "Do not use the API for illegal activities, malware distribution, or to harm others", "Do not abuse the API".
- Access may be suspended "with 7 days' notice where possible".
- **Nothing addresses test accounts, multiple accounts or automated test traffic.** Low-volume CI traffic on our own test athlete fits within the terms as written. Telling david about the CI use is a cheap courtesy, not a requirement.

## 5. Implications for #108 (options, not decisions)

1. **Real API, seeded token (no app change).**
   - Setup: register a test athlete once, consent once via the real app's OAuth client, and keep the bearer token as a CI secret.
   - The e2e setup writes it to `users/{testUid}/integrations/intervals` via the Admin SDK (rules block client writes).
   - Seed/clean Workouts with the test athlete's **API key** (Basic), which carries no scope limit for own data and no OAuth-app dependency.
   - Risks:
     - Undocumented token expiry.
     - Disconnect / delete-account journeys revoking the token.
     - Shared mutable calendar across parallel runs, which calls for per-run date windows or serialised runs.
2. **Real API, API key in the app.** This would need an app change (Basic auth branch keyed off the Firestore doc), which is not black-box. Not recommended.
3. **No real Intervals in CI.** Make `INTERVALS_API_BASE_URL` configurable for an `e2e` build and serve fixtures from a mock server. This is deterministic and has no quota or terms exposure. It needs a small seam, since the URL is a constant today. The Intervals.icu API offers no sandbox to substitute.

## Sources

- OpenAPI 3.0.1 spec: <https://intervals.icu/api/v1/docs>. This is the first-party spec, downloaded 2026-10-15. Includes the security schemes and the events/activities/athletes/disconnect-app paths.
- [API access to Intervals.icu](https://forum.intervals.icu/t/api-access-to-intervals-icu/609): developer's post covering API keys, athlete `0`, rate limits, terms link and Cloudflare.
- [Intervals.icu OAuth support](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759), [post 14](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/14), [page 2](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759?page=2): OAuth flow, scopes, refresh tokens, multiple tokens, registration.
- [Uploading planned workouts to Intervals.icu](https://forum.intervals.icu/t/uploading-planned-workouts-to-intervals-icu/63624): developer's guide to bulk upsert/delete and `CALENDAR:WRITE`.
- [Intervals.icu API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090): developer's guide. It has no sandbox content.
- [Intervals.icu API Terms and Conditions](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087): effective 23 Oct 2025.
- Lower trust, community posts: [steps from description](https://forum.intervals.icu/t/uploading-json-cannot-get-steps-to-be-generated/117959), [account provisioning question](https://forum.intervals.icu/t/provisioning-intervals-accounts-for-a-clubs-athletes-minimal-athlete-friction/130761), [FAQ on Basic vs Bearer](https://forum.intervals.icu/t/intervals-icu-faq/123707/4).
- Repo: `lib/intervalsApi.ts`, `lib/intervalsApiPaths.ts`, `hooks/useIntervalsAuth.ts`, `hooks/useIntervalsConnection.ts`, `functions/src/intervals/{exchangeToken,revokeToken,disconnect,types}.ts`, `firestore.rules`.
