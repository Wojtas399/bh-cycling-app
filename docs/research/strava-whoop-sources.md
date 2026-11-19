# Which source can fill in Strava Activities (#182)

Part of map #181. Research only. All sources were fetched on **2026-10-23**, and **no authenticated calls were made**. Each claim is tagged **[C]** (confirmed in the cited docs or forum post) or **[I]** (inferred).

## The problem in one line

intervals.icu returns any Activity whose only source is Strava as a stub `{id, icu_athlete_id, start_date_local, source:"STRAVA", _note}` (verified in #162). The reason is Strava's API terms: intervals.icu "cannot supply Strava activities via the API" [C, [forum, Oct 2025][f-mcp]]. So the details have to come from somewhere other than intervals.icu's API.

## Summary

|                           | (a) Strava API                                                                                                                         | (b) WHOOP API v2                                                                    | (c) WHOOP → intervals.icu direct                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Exists?                   | Yes                                                                                                                                    | Yes                                                                                 | **No** for workouts. WHOOP → intervals.icu syncs wellness only [C] |
| Covers which stubs        | **Every** stub, because every stub came from Strava by definition [I]                                                                  | Only stubs that started as WHOOP workouts                                           | n/a                                                                |
| Matching                  | **By id**: stub id = Strava activity id [I, strong]                                                                                    | By start time (WHOOP id is a UUID) [C]                                              | n/a                                                                |
| Name / user's description | `name`, `description` [C]                                                                                                              | **None**: no name, title or notes field [C]                                         | n/a                                                                |
| Sport                     | `sport_type`, incl. `Yoga`, `WeightTraining`, `Workout`, `Pilates`, `Crossfit`, `HighIntensityIntervalTraining` [C]                    | `sport_name` / `sport_id` [C]                                                       | n/a                                                                |
| HR / calories             | `calories` [C]. `average_heartrate`/`max_heartrate`/`has_heartrate` are returned in practice but missing from the documented model [I] | `average_heart_rate`, `max_heart_rate`, `kilojoule`, `zone_durations`, `strain` [C] | n/a                                                                |
| PKCE                      | Not documented [C absence]                                                                                                             | Not documented [C absence]                                                          | n/a                                                                |
| Client secret             | Required for exchange **and** refresh [C]                                                                                              | "Only server side, never in a mobile app" [C]. Refresh sample includes it [C]       | n/a                                                                |
| Access token              | 6 h [C]                                                                                                                                | `expires_in` 3600 in sample [C]                                                     | n/a                                                                |
| Refresh token             | Rotates, old one invalidated immediately [C]                                                                                           | Needs `offline` scope, rotates, concurrent refresh fails [C]                        | n/a                                                                |
| Rate limits (per app)     | Read: 100 / 15 min, 1,000 / day (2× after upgrade) [C]                                                                                 | 100 / min, 10,000 / day [C]                                                         | n/a                                                                |
| Athlete cap               | 1 (Single Player), 10 after self-upgrade, more only after **app review** [C]                                                           | 10 members on Sandbox, higher tiers by manual review [C]                            | n/a                                                                |
| Cost                      | Free "currently" [C]                                                                                                                   | No fees mentioned [C absence]                                                       | n/a                                                                |
| Backend needed            | Yes: secret for exchange + every 6 h refresh + revoke [C→I]                                                                            | Yes: same reasons [C→I]                                                             | n/a                                                                |

## (a) Strava API

**Fields** ([API reference][s-ref]). `DetailedActivity` (`GET /activities/{id}`) has `id`, `name`, `sport_type`, `type`, `start_date`, `start_date_local`, `timezone`, `elapsed_time`, `moving_time`, `distance`, `calories`, `description`, `device_name`, `external_id`, `manual`, `private`, `kilojoules`, power fields and `laps` [C]. `SummaryActivity` (`GET /athlete/activities?before=&after=&page=&per_page=`) lacks `calories` and `description` [C], so filling Opis needs one detail call per Activity. The documented model has no HR fields, but the live API is widely seen returning `has_heartrate`, `average_heartrate` and `max_heartrate` [I]. Treat HR as optional.

**Stub id = Strava activity id** [I, strong]. Three independent signals:

- The stub in #162 had a plain numeric id `20679555658`, with no `i` prefix. Native intervals.icu ids are `i…`.
- The intervals.icu CSV glossary defines `id` as "Strava activity ID" [C, [forum][f-csv]].
- A June 2026 forum post shows a Strava-only Activity at `intervals.icu/activities/18837526561`, the same number as `strava.com/activities/18837526561` [C, [forum][f-dup]].

No doc states the rule outright, and some early intervals.icu users have non-`i` ids for non-Strava data [I]. The stub's `source:"STRAVA"` gates the lookup, so `GET /activities/{stub.id}` with a 404 fallback is safe. A `strava_id` field exists on _higher-priority_ Activities that intervals.icu matched to a Strava copy [I, forum], but stubs don't carry it.

**OAuth** ([auth docs][s-auth]):

- Mobile flow: `https://www.strava.com/oauth/mobile/authorize`, which opens the Strava app if installed and otherwise falls back to `ASWebAuthenticationSession` on iOS. No forever tokens on mobile [C].
- `POST /oauth/token` needs `client_secret` for both the code exchange and the refresh [C]. PKCE is not mentioned [C].
- Access tokens last 6 h. Refresh tokens rotate, and the old one is "invalidated immediately" [C].
- Revoke: `POST /oauth/revoke` with HTTP Basic client_id:client_secret, the only supported endpoint from 2027-06-01 [C]. Account Deletion therefore also goes through the backend.
- Scopes: `activity:read` covers Everyone/Followers activities. **`activity:read_all` is needed for "Only You" activities** [C]. Gym and yoga sessions are often private, so request `read_all` [I].

**Rate limits** ([rate limits][s-rl]). The limits are per application, not per athlete: read 100 / 15 min and 1,000 / day by default, 200 / 2,000 after the self-serve upgrade. 429 on excess, with usage in the `X-ReadRateLimit-*` headers [C]. A day with N athletes each opening Home and Calendar, plus one detail call per stub, eats into a single shared 1,000/day budget. So caching Strava detail long-term (it rarely changes) and fetching only stubs in view matter [I].

**Multi-athlete gate** [C, [rate limits][s-rl]]. New apps start in Single Player Mode (1 athlete), and a dashboard upgrade gives 10. Beyond 10 requires the Developer Program form with screenshots and a "Connect with Strava" button, and approval "is not a guarantee". Strava says it only considers apps nearing capacity.

**Terms and branding** ([API agreement, eff. 2026-06-01][s-terms], [brand guidelines][s-brand]):

- A user's Strava data may be shown only to that user, which fits BH Cycling [C].
- "You may not create applications that compete with or replicate Strava functionality" [C]. A training app showing the athlete's own session is a common pattern, but review risk is non-zero [I].
- Apps must use the official "Connect with Strava" button and a "View on Strava" link on Strava data (bold, underline or #FC5200), and "Powered by Strava" no more prominent than the app's own brand [C].
- Strava Data must be deleted on termination [C].
- Access is free but "Strava reserves the right to charge" [C].

## (b) WHOOP developer API v2

**Fields** ([API reference][w-api]). `GET /v2/activity/workout` (paged with `start`, `end`, `limit` ≤ 25 and `nextToken`) and `GET /v2/activity/workout/{uuid}` return `id` (UUID), `v1_id`, `user_id`, `start`, `end`, `timezone_offset`, `sport_name`, `sport_id`, `score_state`, and `score{strain, average_heart_rate, max_heart_rate, kilojoule, percent_recorded, distance_meter, altitude_gain_meter, altitude_change_meter, zone_durations{zone_zero…five_milli}}` [C]. Scope: `read:workout` [C].

**No user-typed name or notes** [C: no such field documented]. The tile can show a sport label ("Joga", "Siłownia") from `sport_name`, but never the athlete's own title or description. WHOOP's Strength Trainer exercise list is also not in the v2 workout payload [C absence].

**Matching a stub** [I]. The WHOOP id is a UUID, unrelated to the Strava or stub id. Matching is by start time: convert WHOOP `start` (UTC) with `timezone_offset` to local time and compare with the stub's `start_date_local`. WHOOP creates the Strava activity from the same workout, so starts should agree to within seconds. A **±2 min** tolerance, tie-broken by nearest start, is a reasonable starting point to test. Overlapping WHOOP workouts, or a stub that came from another Strava source (a phone, Garmin via Strava), would mismatch or miss. In those cases it falls back to the plain stub tile.

**OAuth** ([OAuth][w-oauth], [getting started][w-start]):

- Authorization code flow. Custom-scheme redirects (`whoop://example/redirect`) are allowed [C].
- PKCE is not mentioned [C absence].
- The client secret "should only be used server side and should never be exposed in a client, web, or mobile application" [C].
- Refresh tokens come only with the `offline` scope. They rotate, and concurrent refreshes fail because the first one invalidates the token [C].
- Revoke: `DELETE /v2/user/access` [C].
- v1 webhooks are removed. v2 webhooks exist, but they need a public endpoint [C/I].

**Rate limits and caps** ([rate limiting][w-rl], [app approval][w-appr]):

- 100 req/min and 10,000/day [C].
- Sandbox allows 10 members. Higher tiers come by manual review, one tier at a time, and need ≥ 50 % of the current cap connected before asking. The app also needs a privacy policy URL and must follow the WHOOP brand guidelines [C].
- No fees are mentioned [C absence]. The developer needs a WHOOP account to use the dashboard [C].

**Coverage** [I]. WHOOP only helps athletes who own a WHOOP band. In a multi-athlete app, Strava stubs from any other device stay blank.

## (c) Direct WHOOP → intervals.icu sync

- intervals.icu's native WHOOP integration (June 2024) syncs **wellness only**: sleep, resting HR, HRV, recovery, respiration, SpO2. It doesn't affect fitness scores [C, [forum, David, 2024-06-11][f-whoop]]. The [integrations page][i-int] lists WHOOP without detail. Nothing found shows workout import being added or planned [C absence].
- No maintained WHOOP → intervals.icu activity bridge was found [C absence]. Possible indirect paths, all unverified [I]:
  - WHOOP writes workouts to Apple Health (in-workout HR reported inconsistently, [DC Rainmaker][dcr]), then HealthFit (iOS, paid) pushes them to intervals.icu.
  - A manual FIT export and upload. WHOOP has no documented FIT export.
- Per intervals.icu staff, the general fix for stubs is to connect the device directly, or to run the Strava bulk-archive import once, after which those Activities are readable via the API [C, [forum][f-mcp]]. The archive import does not cover new sessions.
- A per-athlete workaround with no code exists [I]: stop the Strava → intervals.icu path for these sessions and log them in intervals.icu some other way. For yoga and gym, a manual entry or a HealthFit push works. Such Activities are already normal and readable (see `WeightTraining` `i182159659` in #162). This is athlete behaviour, not a product feature.

## Cost and backend for BH Cycling

The app already runs Firebase Cloud Functions (`functions/src/intervals/exchangeToken.ts` holds `INTERVALS_CLIENT_SECRET` in Secret Manager). So "a backend is required" doesn't mean a new platform [C, repo]. What's new for either API:

- an `exchange<Source>Token` callable,
- a `refresh<Source>Token` callable, because both refreshes need the secret. Strava access tokens last 6 h and WHOOP tokens about 1 h, and both rotate refresh tokens, so refresh must be serialized per user, for example in a Firestore transaction,
- revocation in `disconnect` and `deleteAccount`.

Invocation counts stay small, within the Functions free tier [I]. Webhooks are optional, and polling on screen view is enough.

## Recommendation

**Strava API (a).** It is the only source that covers every stub, because they are all Strava activities by construction. It matches by id with no heuristics, and it returns the athlete's own `name`, `description` and a precise `sport_type`. WHOOP (b) gives richer physiology (strain, HR zones) but no titles. It only serves WHOOP owners and needs fuzzy time matching. (c) does not exist for workouts.

The binding cost of (a) is **Strava's athlete cap and app review**: 1 → 10 self-serve, then review with screenshots, brand compliance and the "don't replicate Strava" clause. The app's own invocation and rate budgets are smaller concerns. The spec should design for the 10-athlete tier first and cache aggressively against the shared 1,000/day read limit.

Open, verifiable only with an authenticated call (out of scope here):

- `GET /activities/{stub.id}` returning the athlete's activity, which would confirm stub id = Strava id.
- Which HR fields a WHOOP-originated Strava yoga activity actually carries.
- Whether Strava accepts PKCE without a secret. It is undocumented, so assume not.

## Sources (fetched 2026-10-23)

- [s-auth]: https://developers.strava.com/docs/authentication/
- [s-rl]: https://developers.strava.com/docs/rate-limits/
- [s-ref]: https://developers.strava.com/docs/reference/
- [s-terms]: https://www.strava.com/legal/api
- [s-brand]: https://developers.strava.com/guidelines/
- [w-oauth]: https://developer.whoop.com/docs/developing/oauth
- [w-start]: https://developer.whoop.com/docs/developing/getting-started
- [w-rl]: https://developer.whoop.com/docs/developing/rate-limiting
- [w-appr]: https://developer.whoop.com/docs/developing/app-approval
- [w-api]: https://developer.whoop.com/api
- [i-int]: https://www.intervals.icu/integrations/
- [f-whoop]: https://forum.intervals.icu/t/whoop-integration-added/69075
- [f-mcp]: https://forum.intervals.icu/t/solved-mcp-server-for-coaches-via-api-do-not-see-athletes-activities-brought-from-strava-ans-strava-api-forbids-data-fowarding/113828
- [f-csv]: https://forum.intervals.icu/t/download-all-activities-in-csv-format/599
- [f-dup]: https://forum.intervals.icu/t/duplicate-intervals-icu-activities-referencing-same-strava-linked-activity/130328
- [dcr]: https://dcrainmaker.com/2022/02/whoops-health-integration.html

[s-auth]: https://developers.strava.com/docs/authentication/
[s-rl]: https://developers.strava.com/docs/rate-limits/
[s-ref]: https://developers.strava.com/docs/reference/
[s-terms]: https://www.strava.com/legal/api
[s-brand]: https://developers.strava.com/guidelines/
[w-oauth]: https://developer.whoop.com/docs/developing/oauth
[w-start]: https://developer.whoop.com/docs/developing/getting-started
[w-rl]: https://developer.whoop.com/docs/developing/rate-limiting
[w-appr]: https://developer.whoop.com/docs/developing/app-approval
[w-api]: https://developer.whoop.com/api
[i-int]: https://www.intervals.icu/integrations/
[f-whoop]: https://forum.intervals.icu/t/whoop-integration-added/69075
[f-mcp]: https://forum.intervals.icu/t/solved-mcp-server-for-coaches-via-api-do-not-see-athletes-activities-brought-from-strava-ans-strava-api-forbids-data-fowarding/113828
[f-csv]: https://forum.intervals.icu/t/download-all-activities-in-csv-format/599
[f-dup]: https://forum.intervals.icu/t/duplicate-intervals-icu-activities-referencing-same-strava-linked-activity/130328
[dcr]: https://dcrainmaker.com/2022/02/whoops-health-integration.html
