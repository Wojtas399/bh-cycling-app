# Research: intervals.icu data for a detailed profile

Answers the research ticket "Research: intervals.icu data for a detailed profile" (#342) for the map "Map: Detailed profile card" (#341).

Researched 2026-11-11. Sources:

- **[spec]** The intervals.icu OpenAPI spec, `https://intervals.icu/api/v1/docs`, version `v1.0.0`, downloaded on the day.
- **[forum]** Posts on forum.intervals.icu. Each one is cited with its author and says whether that author is david, the developer.
- **[repo]** `lib/intervalsApi.ts`, `lib/intervalsQueries.ts`, `lib/intervalsApiPaths.ts` and `hooks/intervalsScopes.ts` on `main`.

Labels used below: **Confirmed** means a primary source says it. **Inferred** means it follows from the spec, but nothing states it outright. **Unverified** means it needs a live call before we rely on it.

## TL;DR

- **The current FTP** is `sportSettings[].ftp` (plus `indoor_ftp`) on the athlete record. The app already fetches that record (`GET /athlete/0`) and keeps only `power_zones`. Reading the FTP costs no new request and no new scope.
- **The FTP for a past activity** is `icu_ftp` on the Activity. It is a copy made when intervals.icu analysed the ride, so it can differ from today's FTP. The Activity also carries `icu_power_zones`, the zones that applied then. Activity Details already fetches this body, so these fields are free too. The app's trimmer just drops them today.
- **Watts per block need no FTP at all.** Every detected interval has `average_watts`, `max_watts`, `min_watts`, `zone_min_watts` and `zone_max_watts`. Time in zone is `icu_zone_times` on the Activity.
- **The power stream** comes from `GET /api/v1/activity/{id}/streams.json?types=watts`. It returns `[{type, name, data: number[], ...}]`. The `watts` it returns is intervals.icu's cleaned `fixed_watts`. There is **no server-side resolution, smoothing or resampling parameter**, so the app would have to downsample on device. One sample per recorded tick is typically 1 s, though that isn't guaranteed. Watts-only for a 1–3 h ride is roughly 15–50 KB of JSON (an estimate). Scope: `ACTIVITY:READ`, which the app already asks for (inferred).

## 1. FTP in watts

### The current FTP: athlete sport settings

- **Confirmed [spec]:** `GET /api/v1/athlete/{id}`, "Get the athlete with sportSettings and custom_items", returns `WithSportSettings`. Each `SportSettings` entry has `types`, `ftp` (int), `indoor_ftp` (int), `power_zones` (int[], %FTP), `power_zone_names`, `lthr`, `sft_ftp` and `warmup_time`.
- **Confirmed [spec]:** There is also `GET /api/v1/athlete/{athleteId}/sport-settings/{id}`, "Get sport settings by id or activity type e.g. Run, Ride etc.". It is a smaller body if we ever want just the Ride settings. The app doesn't need it, because it already reads the full athlete.
- **Confirmed [repo]:** `getAthleteSettings` calls `GET /athlete/0` (`INTERVALS_CURRENT_ATHLETE_PATH`). It finds the `sportSettings` entry whose `types` include `Ride` and returns only `{ powerZones }`. `athleteSettingsQueryOptions` feeds that into `resolveZoneConfig`. Widening `IntervalsAthlete` to also read `ftp` (and `indoor_ftp`) is enough to label a Workout Profile's y-axis in watts.
- **Confirmed [repo]:** The app already requests `SETTINGS:READ` (`hooks/intervalsScopes.ts`), and this endpoint already works with it.
- **Inferred:** For a planned **Workout**, the right FTP for watts is the current Ride `ftp`, or `indoor_ftp` for a trainer session if the athlete has set one. The spec doesn't say which of the two intervals.icu uses for a planned workout's target watts. To match intervals.icu exactly, a live check against a calendar event's `workout_doc` would settle it.

### The FTP that applied to a past activity: `icu_ftp`

- **Confirmed [spec]:** The `Activity` schema has `icu_ftp` (int), `icu_power_zones` (int[]), `icu_w_prime`, `p_max` and `icu_zone_times` (`ZoneTime[]`, each `{id, secs}`). It also has the estimate fields `icu_pm_ftp`, `icu_pm_ftp_watts` and `icu_rolling_ftp`, which we don't want: they are model estimates, not the athlete's set FTP.
- **Confirmed [forum]:** The intervals.icu FAQ, "FTP & Zone Settings", says: "FTP in Intervals.icu is copied to each activity. If you change FTP today, old activities are not automatically rewritten." That is post 3 by R2Tom (a forum regular, not david), 3 Mar 2026: https://forum.intervals.icu/t/intervals-icu-faq/123707/3
- **Forum, not the developer:** MedTechCD, 23 Feb 2024: "If you change FTP on an activity summary... it also counts as a change that will reflect in your FTP setting." https://forum.intervals.icu/t/ftp-in-activities-is-different-from-settings-ftp/60997. So the per-activity FTP and the current FTP **can and do differ**.
- **Not found:** I found no post by david saying exactly how `icu_ftp` is chosen at analysis time (whether `ftp` or `indoor_ftp` for a trainer ride). A live comparison of `icu_ftp` against `sportSettings` for a trainer ride would confirm it.
- **Confirmed [repo]:** `activityDetailsQueryOptions` already calls `GET /activity/{id}?intervals=true` and gets the whole body (about 71 KB, per the comment on `getActivity`). `icu_ftp`, `icu_power_zones` and `icu_zone_times` are in that body. `toStoredActivityDetails` (`lib/activityDetails.ts`) trims them away today, so keeping them is a type and trim change, not a new request.

That answers the open map question "FTP at the time vs current" on the data side. **Both are available.** For a recorded Activity, `icu_ftp` with `icu_power_zones` matches what intervals.icu itself showed for that ride.

### Watts without converting from %FTP

- **Confirmed [spec]:** The `Interval` schema (the items of `icu_intervals`) has `average_watts`, `max_watts`, `min_watts`, `weighted_average_watts`, `intensity`, `zone`, `zone_min_watts`, `zone_max_watts`, `start_time`, `end_time`, `start_index`, `end_index` and more. A tap-to-inspect block (option c) can show real watts straight from the interval, with no FTP maths.
- **Confirmed [spec]:** `icu_zone_times` on the Activity gives seconds per power zone. That is the data for a time-in-zone breakdown (option d), already in the Activity Details body.

## 2. Power stream

### Endpoint

- **Confirmed [spec]:** `GET /api/v1/activity/{id}/streams{ext}`, operation `getActivityStreams`, "List streams for the activity". Its parameters:
  - `ext` (path): `.csv` returns CSV, and anything else (use `.json`) returns JSON.
  - `types` (query, string[]): the streams to return, e.g. `types=watts`.
  - `includeDefaults` (query, boolean, default false): adds the default streams on top of `types`.
- **Confirmed [spec]**, quoted from the description: "Note that this endpoint will return 'fixed_watts' as 'watts'. If 'raw_watts' is asked for or types is null then the 'watts' stream is renamed to 'raw_watts'." So `types=watts` gives the cleaned power stream (spikes and dropouts fixed), which is the one to draw.
- **Confirmed [spec]:** The response is `ActivityStream[]`, each `{ type, name, data, data2, valueTypeIsArray, anomalies, custom, allNull }`. `data` is typed only as `object`. In practice it's an array of numbers, one per tick (inferred from the forum posts below).
- **Forum, not the developer:** R2Tom, 14 May 2025, gives `/api/v1/activity/{id}/streams.json?types=watts` for power only, adding "Only if you use ".csv" it will download a csv file instead of json response". https://forum.intervals.icu/t/access-activities-streams-via-api/101065
- **Confirmed [forum, david]:** On the time stream: "The seconds trace (first entry is 0) since the start of the activity". From "Server side data model for scripts", 8 Jul 2023: https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781. On the CSV streams: "The time column holds seconds since the start of the activity with the first row 0." From david, 27 Oct 2025: https://forum.intervals.icu/t/download-and-upload-activity-streams-csv/114377

### Resolution and smoothing options

- **Confirmed [spec]: there are none.** `types`, `includeDefaults` and `ext` are the only parameters. There is no downsampling, resampling, smoothing or `resolution` parameter, unlike Strava's `resolution=low|medium|high`.
- **Confirmed [forum, david]:** Ticks aren't guaranteed to be 1 s apart. "activity.icu_median_time_delta is the median time between data ticks" is from david, 8 Sep 2024: https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781/26. In Dec 2022 he wrote "if you are concerned about activities with multiple seconds between ticks... You need to get the fixed_heartrate stream and maybe also time" and "I am going to add some support for interpolating these streams to 1 second per tick soon": https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781. I found no confirmation that the API stream is now interpolated.
- **Practical consequence (inferred):** To place samples on the time axis correctly, fetch `types=time,watts` and use `time` as x, or else assume 1 s ticks when `icu_median_time_delta` is 1. Smoothing (e.g. a 10–30 s rolling mean) and bucketing to the chart's pixel width must happen on device. That fits the app's existing pattern of deriving view models in `select`.
- **Also available [spec]:** `GET /api/v1/activity/{id}/power-histogram` and `/power-curve{ext}` exist. Neither is a time series, so neither helps draw the profile.

### Payload size for a 1–3 h ride

- **Unverified (estimate):** A 1 Hz stream has 3,600 samples per hour. Power values are 1–4 digits, plus a comma, so about 4–5 bytes each.
  - Watts only: about 15–18 KB per hour, so **about 15–55 KB for 1–3 h**.
  - Adding `time`: about 5–6 bytes per sample, so roughly double that, **about 35–110 KB**.
  - The default set (`types` omitted: every recorded stream, including latlng, HR, cadence, altitude and so on) would be several hundred KB. Always pass `types`.
  - The spec doesn't say whether the server gzips (`Content-Encoding`). React Native's `fetch` sends `Accept-Encoding: gzip` and decompresses transparently, and number arrays compress well.
- These figures should be measured with one live call on a real 1–3 h ride before the spec locks the fetch strategy.

### Auth scope

- **Confirmed [forum, david]:** The OAuth scopes are "ACTIVITY: Completed rides, runs etc.", "WELLNESS", "CALENDAR: Planned workouts", "CHATS", "LIBRARY" and "SETTINGS: Athlete settings", each as READ or WRITE (WRITE includes READ). From "Intervals.icu OAuth support", david, 30 Jan 2021: https://forum.intervals.icu/t/intervals-icu-oauth-support/2759
- **Confirmed [spec]:** The streams endpoint declares no per-operation scope, only the global `APIKey` / `AccessToken` (bearer) schemes.
- **Inferred:** Streams belong to the activity, so they come under `ACTIVITY:READ`. The app already requests `ACTIVITY:READ`, `CALENDAR:READ`, `WELLNESS:READ` and `SETTINGS:READ` (`hooks/intervalsScopes.ts`), so **no consent change is needed**. A 403 on the first live call would disprove this, and `isForbiddenError` already exists for that case.
- **Caveat [repo]:** A Strava-sourced Activity comes back as a stub (`source: 'STRAVA'`, `_note`) on `GET /activity/{id}`. Its streams are presumably unavailable too (unverified), so the finer Activity Profile must fall back to the interval blocks.

## What the app already has vs needs

| Need                             | Source                                                                              | Already fetched?                              |
| -------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| Current Ride FTP (W)             | `GET /athlete/0` → `sportSettings[Ride].ftp` / `indoor_ftp`                         | Yes, but discarded by `getAthleteSettings`    |
| FTP at the time of an Activity   | `GET /activity/{id}` → `icu_ftp`                                                    | Yes, but trimmed by `toStoredActivityDetails` |
| Zones at the time of an Activity | `icu_power_zones`                                                                   | Yes, but trimmed                              |
| Watts per detected block         | `icu_intervals[].average_watts` / `max_watts` / `zone_min_watts` / `zone_max_watts` | Yes, but trimmed                              |
| Time in zone                     | `icu_zone_times`                                                                    | Yes, but trimmed                              |
| Power stream                     | `GET /activity/{id}/streams.json?types=time,watts`                                  | **No**, a new request and a new query         |

## Open, needing a live call

1. The actual size and encoding of `streams.json?types=watts` (and `time,watts`) for a 1 h and a 3 h ride.
2. Whether `time` has gaps, or is interpolated to 1 s, on a ride with pauses.
3. Whether `icu_ftp` picks `indoor_ftp` for a trainer ride.
4. Whether a Strava-sourced Activity's streams endpoint returns 200 with no data, or a 404.
