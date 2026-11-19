# Research: intervals.icu Activity streams for the Route

Answers issue #132 (part of map #131). Researched 2026-10-17.

## Sources

| Tag            | Source                                                                                                                                                                                   | Trust                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **[SPEC]**     | intervals.icu OpenAPI 3.0.1 spec, served as JSON at <https://intervals.icu/api/v1/docs>. Fetched 2026-10-17.                                                                             | Primary. Names and types; few descriptions. No per-endpoint scope annotations. |
| **[DM]**       | `@intervals-icu/js-data-model` 1.2.0 on npm (publisher `davidtinker`), `dist/index.d.ts`. The developer's TypeScript interfaces for the server data model.                               | Primary (developer)                                                            |
| **[D-609]**    | David Tinker, "API access to Intervals.icu": <https://forum.intervals.icu/t/api-access-to-intervals-icu/609> (post numbers as `#n`)                                                      | Primary (developer)                                                            |
| **[D-2759]**   | David Tinker, "Intervals.icu OAuth support": <https://forum.intervals.icu/t/intervals-icu-oauth-support/2759>                                                                            | Primary (developer)                                                            |
| **[D-80090]**  | David Tinker, "Intervals.icu API Integration Cookbook" (2024-11-20): <https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090>                                        | Primary (developer)                                                            |
| **[D-32420]**  | "Possible bug on latitude/longitude STREAM" (2023-02-28), David's answer #2: <https://forum.intervals.icu/t/32420>                                                                       | Primary (developer)                                                            |
| **[D-110818]** | "Guidance on API rate limits for bulk activity reloading" (2025-08-21), David's answer #2: <https://forum.intervals.icu/t/110818>                                                        | Primary (developer)                                                            |
| **[F-131074]** | "Increase rate limit for the application" (2026-08-20): <https://forum.intervals.icu/t/131074>                                                                                           | Secondary (an app developer stating their own limit)                           |
| **[HDR]**      | Response headers of an unauthenticated `GET /api/v1/activity/i1/streams?types=latlng`, 2026-10-17 (401, `cf-cache-status: DYNAMIC`, behind Cloudflare, `access-control-allow-origin: *`) | Observed                                                                       |
| **[APP]**      | This repo on `origin/main`: `lib/intervalsApi.ts`, `lib/intervalsApiPaths.ts`, `lib/intervalsQueries.ts`, `lib/workoutDetails.ts`, `hooks/useIntervalsAuth.ts`                           | Primary (our code)                                                             |

**Not verified against a live account.** No authenticated calls were made, so the exact JSON of a real `latlng` stream, the no-GPS response and the real payload sizes are inferred from the spec, the data model and developer posts. Each such point is marked _unverified_ below. One authenticated `curl` against a real outdoor ride and a real trainer ride would settle all of them (see "To verify" at the end).

---

## 1. Endpoint and response shape

There are **two** read endpoints that return a GPS track:

### 1a. `GET /api/v1/activity/{id}/streams{ext}` (`getActivityStreams`)

- `{ext}` is empty for JSON or `.csv` for CSV ([SPEC]; [D-609] #218: "You can choose ext=.csv or blank to get JSON data").
- Query `types`: the streams wanted, comma-separated, e.g. `?types=latlng` ([SPEC]; [D-609] #218 shows `?types=time,watts,distance,...`). `includeDefaults` (default `false`) adds the default streams on top.
- Response: a JSON **array** of `ActivityStream` ([SPEC]):

  ```ts
  interface ActivityStream {
    type?: string; // "latlng"
    name?: string;
    data?: Object; // latitude array for latlng
    data2?: Object; // longitude array, only for latlng
    valueTypeIsArray?: boolean;
    anomalies?: Anomaly[];
    custom?: boolean;
    allNull?: boolean; // [SPEC] only, not in [DM]
  }
  ```

- **Lat/lng are two parallel arrays, not pairs.** "`data2`: Float[] only for type latlng holding the longitude data (latitude is in data)" ([DM] `ActivityStream`). David: "You need to use lat.data2 to get the longitude data" ([D-32420] #2). So point _i_ is `[data[i], data2[i]]`.
- **Units:** decimal degrees (WGS84). Inferred: the API is metric throughout, and David's `/map` bounds example `-34,18.35,-33.95,18.36` is plain degrees ([D-609] #468). _No source states "degrees" for the stream outright._
- **Sampling:** one value per recorded sample, aligned by index with the `time` stream. Usually 1 Hz, but a device on "smart recording" gives fewer samples ([D-609] #223 list of stream types; David in forum topic 111107 #20 on smart recording). Not resampled to a fixed resolution for the client.
- **Nulls on GPS dropouts:** _unverified_. The spec's `allNull` flag and the data model typing `data` as a loose `Object` suggest nulls are possible inside the array. Parse defensively: drop any index where either value is `null`/non-finite (and treat `0,0` as invalid).

### 1b. `GET /api/v1/activity/{id}/map` (`getActivityMap`)

- Returns `MapData` ([SPEC]):

  ```ts
  interface MapData {
    bounds?: number[][]; // bounding box
    latlngs?: number[][]; // the track as [lat, lng] pairs (pair order inferred)
    route?: AthleteRoute; // the matched named route, if any
    weather?: ActivityWeather; // only with ?weather=true
  }
  ```

- Query params ([SPEC]; [D-609] #465, #468, 2024-09):
  - `boundsOnly=true`: return only `bounds`, no points. A tiny response.
  - `bounds=a,b,c,d`: only return points inside that box.
  - `weather=true`: include weather points.
- This is the endpoint the intervals.icu web app uses for its map; a forum user who needed a GPS track used it rather than streams ([D-32420] #3: "I was using the 'map' API endpoint").
- It gives **already paired** points plus a ready **bounding box**, which is exactly what a map needs to fit its camera. Whether its `latlngs` are downsampled is _unverified_; a user called the response "quite big" ([D-609] #464), which suggests it is not heavily thinned.

**Recommendation for the spec:** prefer `/map` for the Route (pairs + bounds in one call, purpose-built), and keep `/streams?types=latlng` as the documented fallback. Both need only `ACTIVITY:READ` (section 2). Confirm `/map`'s pair order and point count with one real call before locking it.

Neither endpoint is wrapped in [APP] yet. A new path helper would go in `lib/intervalsApiPaths.ts` (`/activity/${activityId}/map` or `/activity/${activityId}/streams`), with the request through the existing `request<T>()` in `lib/intervalsApi.ts`. Note `request()` only forwards `oldest`/`newest`-style string params today; `types=latlng` or `boundsOnly` would need the params type widened.

## 2. OAuth scope

- The app requests `ACTIVITY:READ,CALENDAR:READ` ([APP] `hooks/useIntervalsAuth.ts:21`; the same string is in `functions/src/intervals/__tests__/exchangeToken.test.ts`).
- intervals.icu scopes are coarse, per data area: `ACTIVITY` ("Completed rides, runs etc."), `WELLNESS`, `CALENDAR`, `CHATS`, `LIBRARY`, `SETTINGS`, each `READ` or `WRITE` ([D-2759] #1; David #47: "These are the scopes: ACTIVITY, WELLNESS, CALENDAR, LIBRARY, SETTINGS"). There is no finer-grained "streams" or "GPS" scope.
- Activity reads document `ACTIVITY:READ` as the requirement ([D-80090]: "Call the list activities endpoint (ACTIVITY:READ scope is required)"; the same section downloads `/activity/{id}/file` with the same token).
- **Conclusion: the current scope is enough; no reconnect.** Streams and map are sub-resources of an Activity under the `ACTIVITY` scope. _The spec has no per-endpoint scope annotations, so this is inferred from the scope model, not stated per endpoint._ A 403 on first real call would disprove it.

## 3. Payload size

Estimates, _unverified against a real response_:

| Ride | Points at 1 Hz | `/streams?types=latlng` JSON (two arrays, ~10 B per number incl. comma) | gzip (~35–45 %) |
| ---- | -------------- | ----------------------------------------------------------------------- | --------------- |
| 1 h  | ~3,600         | ~70–80 KB                                                               | ~30 KB          |
| 3 h  | ~10,800        | ~210–240 KB                                                             | ~90 KB          |
| 5 h  | ~18,000        | ~350–400 KB                                                             | ~150 KB         |

`/map` with `[lat,lng]` pairs adds ~4 bytes per point for brackets, so roughly 10–20 % more if it is not downsampled. Smart-recording devices give fewer points.

**Lighter options intervals.icu offers:**

- `/map?boundsOnly=true`: bounds only, a few bytes ([D-609] #465). Useful for a camera fit, not for drawing.
- `/map?bounds=...`: clip to a box. Not a downsample.
- **No** encoded/summary polyline field on `Activity` and **no** resolution or downsample parameter on either endpoint ([SPEC]: checked the `Activity` schema and both endpoints' parameters).

So any simplification (e.g. Douglas–Peucker to a few hundred points for the static inline map) happens **in the app**. 18,000 points is fine to parse but is more than a static thumbnail needs.

## 4. Detecting "no GPS" before fetching

Available on the Activity, and requestable through the `fields` projection the app already sends on the list call ([APP] `WORKOUT_DETAILS_ACTIVITY_FIELDS` in `lib/workoutDetails.ts`; [SPEC] `fields`: "Comma separated list of field names to include … also excludes null values"):

| Field          | Meaning                                                                                      | Source                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `stream_types` | `string[]` of the **stored** streams. Contains `"latlng"` when the Activity has a GPS track. | [DM]: "These are the stored streams"; David [D-609] #259: "You can look for "latlng" in activity.stream_types." |
| `trainer`      | `boolean`, indoor/trainer ride.                                                              | [SPEC], [DM]                                                                                                    |
| `type`         | e.g. `"Ride"`, `"VirtualRide"`.                                                              | [SPEC]                                                                                                          |

**Rule:** show the Route only when `stream_types` includes `"latlng"` **and** the ride is not virtual/indoor (`type !== 'VirtualRide'` and `trainer !== true`). Add `stream_types` and `trainer` to `WORKOUT_DETAILS_ACTIVITY_FIELDS`: zero extra requests.

Why the second half: virtual-platform files (Zwift and similar) commonly carry **fake GPS** for the game world, so `latlng` can be present on a `VirtualRide`. _This is general knowledge about Zwift FIT files, not something found in an intervals.icu source._ Whether such a track would be wanted is a product call for the spec; the map's scope note ("With no track (indoor/trainer ride), the map section doesn't render") points to skipping it.

There is **no** `start_latlng`-style field on the intervals.icu `Activity` schema ([SPEC]), so "start lat/lng present" is not an option. `stream_types` is the signal. Because `fields` excludes nulls, a missing `stream_types` key should be read as "no streams".

## 5. Behaviour when the Activity has no GPS

_Unverified_; nothing in the spec or forum says. What the sources imply:

- `/streams?types=latlng`: most likely `200` with an **empty array** or without a `latlng` entry. The spec's `allNull` flag means an entry whose values are all null is also possible. `404` is for an unknown activity id ([APP] already maps 404 to `isNotFoundError`).
- `/map`: most likely `200` with empty or absent `latlngs`/`bounds`.

Handle all of these as "no Route" (don't render), and treat any non-OK status as a Route-only failure (the map is optional and loads on its own per #131). With the section 4 check in place this path should be rare.

## 6. Rate limits and caching

- Per-token request limits: **30 requests/s over 1 s and 132 requests per 10 s** ([D-110818] #2, David, 2025-08-21). Over that, a `429`.
- There is also a **per-application daily limit**; one developer reports 50,000/day for their app ([F-131074], secondary).
- One extra request per Workout Details view in completed mode is far inside both.
- The API sends **no useful HTTP caching headers**: responses go through Cloudflare with `cf-cache-status: DYNAMIC` ([HDR]). Caching is the client's job. A ride's GPS track never changes after upload, so a long `staleTime` in TanStack Query (ADR-0005) for the Route query is safe, and the full-screen preview can reuse the cached Route instead of re-fetching.
- CORS is open (`access-control-allow-origin: *`, [HDR]); irrelevant for React Native but fine.

## To verify (one authenticated session)

```sh
# outdoor ride
curl -s 'https://intervals.icu/api/v1/activity/<id>/streams?types=latlng' -H 'Authorization: Bearer <token>' | wc -c
curl -s 'https://intervals.icu/api/v1/activity/<id>/map' -H 'Authorization: Bearer <token>' | head -c 400
# trainer ride
curl -si 'https://intervals.icu/api/v1/activity/<trainer id>/streams?types=latlng' -H 'Authorization: Bearer <token>'
curl -si 'https://intervals.icu/api/v1/activity/<trainer id>/map' -H 'Authorization: Bearer <token>'
```

Check: pair order in `/map` `latlngs`, whether `/map` is downsampled (compare its point count with the stream's), nulls in the stream, the exact no-GPS response, and that `ACTIVITY:READ` alone returns `200`.
