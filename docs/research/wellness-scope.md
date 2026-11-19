# How a connection gains `WELLNESS:READ`

Research for #238 (map #236). The question: how does a BH Cycling connection gain `WELLNESS:READ`, and what happens to a connection that lacks it?

All sources were fetched on **2026-11-01**. No authenticated calls were made, so nothing here was observed on a live account. **Confirmed** means a linked primary source, or this repo's code, states it. **Inferred** means it follows from the evidence but no source says it directly. Section 7 lists the manual checks that settle what only a live test can.

## Short answer

- **Registration:** no change is needed for staging or production. Scopes are requested per authorization, not set on the OAuth app. **Inferred**, strongly.
- **Re-authorizing:** the athlete sees the consent page and must press OK. Intervals.icu issues a new token, the old one stays valid, and the latest scopes apply to all of that athlete's tokens for the app. **Confirmed**.
- **Firestore:** `exchangeIntervalsToken` overwrites the whole integration document, including `scope`. Nothing else in the app changes. **Confirmed**.
- **Wellness without the scope:** expect **403**, not 401. **Inferred**: the developer ties 403 to missing scopes, but no source shows the Wellness endpoint itself.
- **Global reconnect:** only a 401 triggers it. A 403 becomes `IntervalsApiError`, and the global handler ignores that. **Confirmed** from the code. So a missing scope will not clear the connection, provided check 1 returns 403.
- **Stored `scope`:** reliable at the moment of authorization, and it can go stale afterwards, because athletes can edit an app's permissions in Intervals.icu and the app has no webhook to hear about it. **Confirmed**. Use it as the first signal, and treat a Wellness 403 as the second.

## Sources

| Key              | Source                                                                                                                                                                                                                                                                                    | Trust                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [OAuth]          | [Intervals.icu OAuth support](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759), first post (developer, last edited 2026-10-20)                                                                                                                                             | Primary                                                                                                 |
| [Cookbook]       | [API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090) (developer)                                                                                                                                                                        | Primary                                                                                                 |
| [Spec]           | [OpenAPI spec](https://intervals.icu/api/v1/docs)                                                                                                                                                                                                                                         | Primary, but it documents almost no error codes                                                         |
| [Bundle]         | Public web client at [intervals.icu](https://intervals.icu): `OAuthAuthorizePage`, `OAuthClientForm`, `index` chunks, Sentry release `4e8dd052`                                                                                                                                           | Primary for the client only. It shows what the UI does, not what the server enforces, and it can change |
| Forum posts      | Linked where used. Posts by `david` are from the developer                                                                                                                                                                                                                                | Developer posts are primary. Others are reports                                                         |
| Third-party code | [triathlon-agent](https://github.com/radikkhaziev/triathlon-agent), [watt-mind/coach](https://github.com/watt-mind/coach), [open-health-sync](https://github.com/soma-intelligence/open-health-sync), [futureweb/intervals-mcp-server](https://github.com/futureweb/intervals-mcp-server) | Corroboration only                                                                                      |

## 1. What the app does today

**Confirmed** from the code on `main` at `5dfaac3`.

**The request.** `hooks/useIntervalsAuth.ts:21` holds `SCOPES = ['ACTIVITY:READ,CALENDAR:READ']`. `expo-auth-session` joins array items with a space (`AuthRequest.js:219`), but Intervals.icu separates scopes with commas [OAuth]. So the new scope must go inside the existing string, not in a second array item:

```ts
const SCOPES = ['ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ'];
```

**On a 401.** `lib/intervalsApi.ts:244` throws `IntervalsAuthError`, and `QueryCache.onError` catches it (`lib/queryClient.ts:9`). `handleIntervalsAuthError` then:

1. sets `needsReconnect`, which disables every Intervals query (`lib/handleIntervalsAuthError.ts:17`, `hooks/useIntervalsAvailability.ts:28`) and shows the global banner;
2. removes the `['intervals']` query prefix;
3. deletes the Firestore integration document (`lib/handleIntervalsAuthError.ts:25`).

**On a 403.** `lib/intervalsApi.ts:249` throws `IntervalsApiError(403)`. It is not an `IntervalsAuthError`, so the global handler does nothing. The query that made the call fails, and nothing else is touched: no banner, no wipe, no delete. No code treats 403 specially today.

**On re-authorization.** `functions/src/intervals/exchangeToken.ts:56-66` calls `.set()` with `accessToken`, `athleteId`, `athleteName`, `scope` and `connectedAt`, which replaces the document. `scope` comes straight from the token response. The function does not revoke the previous token. In the app, `connect.onSuccess` calls `setNeedsReconnect(false)` and shows a toast, and removes no queries. The Firestore listener delivers the new token. Query keys don't contain the token (ADR 0005), so cached data survives.

| Outcome at consent               | Result                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| Cancel, or `error=access_denied` | `'cancelled'`. Nothing changes, and the old connection keeps working |
| OK with Wellness ticked          | Document replaced, `scope` includes `WELLNESS:READ`                  |
| OK with Wellness unticked        | Same path and the same "connected" toast, but `scope` lacks it       |
| Exchange fails                   | Error toast. The old document stays                                  |

`useIntervalsConnection` does not expose `scope` today, so the hook needs a new field. `firestore.rules` already lets the athlete read the document.

## 2. Does the OAuth app registration need changing?

No, on either environment.

- The list of scopes is global, and the client asks for them in the authorize URL. [OAuth] **Confirmed**
- The app management form has no scope setting. Its fields cover redirect URLs, webhooks, PKCE and public-client flags. The only "scope" in that chunk is the informational "Scope Required" column of the webhook table. [Bundle] **Confirmed** for the form.
- So there is no per-app allow-list that the owner can edit. **Inferred**. A server-side limit nobody documents remains possible but unlikely, and check 3 on staging settles it.
- The redirect URI doesn't change. The change is JavaScript only, so it can ship by OTA. **Inferred** from the release flow in `README.md`.

The app does not need `WELLNESS` webhooks for this.

## 3. An already connected athlete authorizes again

- **Consent appears.** `OAuthAuthorizePage` always loads the app and its scopes, then waits for the athlete to press OK. There is no branch that skips ahead for a returning athlete. [Bundle] **Confirmed** for the client. A server redirect before the page loads is not ruled out, but opening `/oauth/authorize` returned the web client. **Inferred**
- **The athlete can narrow the grant.** The page shows Read and Write checkboxes per scope, and sends only what is ticked. [OAuth] [Bundle] **Confirmed**
- **A new token is issued.** "A new token is generated each time a user auths an app." ([#14](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/14)) **Confirmed**
- **The old token is not replaced.** Replacement was the behaviour until 2023. Now: "There can be many access tokens for an athlete linked to an app, once for each time they authorise it. The most recent scopes apply to all access tokens." ([#24](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/24)) **Confirmed**. [futureweb](https://github.com/futureweb/intervals-mcp-server/blob/main/docs/REMOTE_ACCESS.md) documents the same behaviour from running it.
- **Tokens do not expire,** and there is no refresh flow. Sending the athlete back through `/oauth/authorize` is the recovery path. ([#725](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/725)) **Confirmed** by a forum moderator, not the developer. The developer also said there are no refresh tokens ([#9](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/9)).

**What follows for the app.** The prompt in the card can call `handleConnect` directly. There must be no disconnect first: `disconnectIntervals` deletes the document and revokes the app's access, and the connect flow doesn't need it. The orphaned old token is harmless, since the app no longer holds it. **Inferred**

Whether the consent page pre-ticks scopes the athlete already granted, or only the requested ones, can't be read from the client because the server supplies them. **Unknown**, and it only affects the look of the page (check 3).

## 4. What Wellness returns for a token without the scope

**Expect 403.** **Inferred**. The evidence, strongest first:

| Evidence                                                                                                                                                                                                                                                                                                                                                        | Endpoint                        | Status       | Tag                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------ | ------------------------ |
| Developer: "You need to have ACTIVITY:WRITE scope to upload activities. Maybe it is that? I will update the 403 message to indicate why it is a 403." The user confirmed the unticked box was the cause. ([#298](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/298), [#299](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/299)) | Activity upload (write)         | 403          | Confirmed                |
| Developer, on a 403 with a valid token: "This might happen if the user didn't grant all the scopes you were asking for." ([#4](https://forum.intervals.icu/t/streams-api-endpoint-gets-a-403-with-an-otherwise-valid-bearer-token/113233/4))                                                                                                                    | `/activity/{id}/streams` (read) | 403          | Confirmed, though hedged |
| App developer: without `SETTINGS:READ`, "GET /athlete/0 returns 403". ([#11](https://forum.intervals.icu/t/veloforge-adaptive-coaching-that-connects-training-recovery-and-fueling/130908/11))                                                                                                                                                                  | `/athlete/0` (read)             | 403          | Report                   |
| [open-health-sync](https://github.com/soma-intelligence/open-health-sync/blob/main/docs/connectors/intervals-icu.md) treats 401 as "reconnect" and 403 as a possible missing scope, and marks that as unconfirmed                                                                                                                                               | Wellness                        | Not observed | Report                   |

What the sources do not give:

- **The Wellness endpoint itself.** [Cookbook] says `WELLNESS:READ` is required, but no source shows the response without it. [Spec] lists only 200 for every Wellness route, and its security block has no per-scope data.
- **A 401 for a missing scope.** No source reports one.

**This repo adds one more piece of evidence.** The app already calls `/athlete/0` without `SETTINGS:READ` (section 6). If a missing scope returned 401 there, `handleIntervalsAuthError` would clear every connection on the first fetch. No connection could then survive a Home load, which would have been obvious long ago, so that call does not return 401. **Inferred** (check 2 settles it)

**403 is not unique to scopes.** A wrong athlete id gives `403 {"error":"Access denied (Bearer token is for a different athlete)"}` ([report](https://forum.intervals.icu/t/two-oauth-apps-fail-with-bearer-token-is-for-a-different-athlete-grants-are-authorized-under-my-own-athlete-single-account-no-coach-multi-athlete-setup/130540)). The app sends the token's own athlete id, so that shouldn't arise here. Use the status code only, and don't parse the message: the developer said it would change, and no source gives its current wording. **Inferred**

**A revoked token is unclear.** One moderator guessed "access denied" ([#725](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/725)), while open-health-sync expects 401. If it is 403, the global reconnect flow doesn't fire for revoked tokens at all, which is an existing gap outside this ticket. A 403 prompt in the card would still give the right recovery (check 4).

## 5. Is the stored `scope` reliable?

**At authorization, yes.** The token response returns "granted scopes" [OAuth], so unticked boxes are reflected, and the web client builds the value as comma-separated `SCOPE:PERMISSION` pairs. [Bundle] **Confirmed**

**Afterwards, no.** It's a snapshot.

- Athletes can change an app's permissions at any time: `EditAuthorizedAppDialog` in Connected Apps updates them through `/api/athlete/{id}/authorized-apps/{client}`. [Bundle] **Confirmed**
- Intervals.icu announces this with the `APP_SCOPE_CHANGED` webhook, described as "Athlete changed permissions for this app". [Bundle] **Confirmed**. [triathlon-agent](https://github.com/radikkhaziev/triathlon-agent) stores the `scope` it carries.
- This app has no webhook receiver (nothing in `functions/src`, `lib` or `hooks` mentions one). **Confirmed**
- A second BH Cycling account linked to the same Intervals.icu athlete would also change the effective scopes, without touching this document, because of "most recent scopes apply to all". **Inferred**

So the document can be wrong in both directions: it can claim the scope after the athlete removed it, or lack it after the athlete added it in Intervals.icu.

**Parsing it.**

- Split on `,` and match exactly. A substring check isn't needed and would be fragile.
- `WELLNESS:WRITE` also counts, because WRITE implies READ. [OAuth] The app won't request it, but the consent page and Connected Apps both show a Write checkbox per scope, so an athlete could grant it. [Bundle]
- Don't assume an order.
- Treat a missing `scope` field as lacking the scope.

### Recommended detection

Use two signals, and adding a webhook isn't justified for this.

1. **Stored scope, up front.** If it lacks the scope, show "Połącz ponownie" and skip the Wellness query. Every existing connection lands here with no failed request.
2. **Wellness 403, as the fallback.** If the query fails with `IntervalsApiError` status 403, show the same prompt. A helper like `isNotFoundError` fits (`lib/intervalsApi.ts:31`).

This refines the map's rule "a failed Wellness fetch hides only the card": a 403 shows the prompt, and any other failure hides the card.

**Refetching after reconnect.** A Wellness query that failed with 403 won't recover on its own. The key doesn't change when the token does, `connect.onSuccess` removes nothing, and with no data a query is stale but still needs a trigger (`isStaleByTime` in `@tanstack/query-core`). A query gated on signal 1 starts when the gate opens, but one that hit signal 2 stays failed until a foreground refetch or a refresh. The spec should have a successful connect invalidate the Wellness query. It doesn't matter if that fetch races the Firestore update, because the old token gets the new scopes too. **Inferred**

## 6. Related finding: `/athlete/0` and `SETTINGS:READ`

This one is outside the question, but it costs a re-consent to fix later.

- `GET /athlete/{id}` needs `SETTINGS:READ`, per the developer ([#47](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/47)). **Confirmed**
- The app doesn't request that scope, yet `getAthleteSettings` calls `/athlete/0` for power zones (`lib/intervalsApi.ts`), and `lib/intervalsQueries.ts:414` silently falls back on failure: `.catch(() => resolveZoneConfig(null))`, which gives the default Coggan ceilings. **Confirmed**
- So, if [the 403 report](https://forum.intervals.icu/t/veloforge-adaptive-coaching-that-connects-training-recovery-and-fueling/130908/11) holds, every athlete's Workout Profile uses default zones rather than their own, and nothing shows it. **Inferred** (check 2)

Two things follow. It's a free live test of what this app gets for a missing scope, and if confirmed, `SETTINGS:READ` belongs in the same scope change, so that athletes go through consent only once.

Also, an earlier project note says Intervals.icu doesn't support PKCE. That's out of date: [optional PKCE arrived on 2026-10-20](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759/64). Nothing here depends on it.

## 7. Manual checks

Run these on staging with your own account. `TOKEN` is `accessToken` from `users/{uid}/integrations/intervals` in the Firebase console, from a connection made with today's scopes. Don't paste it anywhere shared.

**Check 1: the status without the scope (decides the design).**

```bash
curl -i "https://intervals.icu/api/v1/athlete/0/wellness/$(date +%F)" -H "Authorization: Bearer $TOKEN"
curl -i "https://intervals.icu/api/v1/athlete/0/wellness?oldest=$(date +%F)&newest=$(date +%F)" -H "Authorization: Bearer $TOKEN"
```

Expected: 403 from both, and the body shows the current message. **If either returns 401, stop:** the card's query would clear the connection, so `request()` needs a way to tell the cases apart, and section 5 changes. If it returns 200, the scope isn't enforced on reads, and the prompt could only be driven by the stored scope.

**Check 2: the existing `SETTINGS` gap.**

```bash
curl -i "https://intervals.icu/api/v1/athlete/0" -H "Authorization: Bearer $TOKEN"
```

A 403 confirms section 6. A 200 with `powerZones` means personal zones work without the scope and the finding can be dropped. Either way, a 401 would contradict section 4.

**Check 3: widening a connected athlete.**

1. Change `SCOPES` as in section 1, run the app against staging, and press connect while connected, without disconnecting.
2. Note whether consent appears, and what is ticked.
3. Press OK. In Firestore, confirm `accessToken` changed and `scope` includes `WELLNESS:READ`.
4. Re-run check 1 with the **old** token. A 200 confirms that old tokens gain the scope.

**Check 4: stale scope and revocation.**

1. In Intervals.icu, open Settings → Connected Apps, edit the app and untick Wellness. Re-run check 1 with the new token. Expected: 403, while Firestore still lists the scope.
2. Remove the app there, then call the same URL. A 401 means the global reconnect flow covers revocation. A 403 means it doesn't, which is the gap in section 4.

## 8. Open questions

- The exact status and body from the Wellness endpoint (check 1).
- Whether `/athlete/0` returns 403 for this app (check 2).
- What a revoked token returns (check 4).
- Whether consent pre-ticks existing grants (check 3).
