# Research: intervals.icu Workout and Activity fields for Workout Details

Answers issue #51 (part of map #50). Researched 2026-10-08.

## Sources

| Tag            | Source                                                                                                                                                                                                  | Trust                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **[SPEC]**     | intervals.icu OpenAPI 3.0.1 spec, served as JSON at <https://intervals.icu/api/v1/docs> (Swagger UI: <https://intervals.icu/api-docs.html>). Fetched 2026-10-08.                                        | Primary. Gives field **names and types** but no field descriptions or units. `workout_doc` is typed only as a free-form `object`. |
| **[D-609]**    | David Tinker (developer), "API access to Intervals.icu" thread: <https://forum.intervals.icu/t/api-access-to-intervals-icu/609> (post numbers cited as `#n`)                                            | Primary (developer)                                                                                                               |
| **[D-93737]**  | David Tinker, "Downloading planned workouts from the API" (2025-03-13): <https://forum.intervals.icu/t/downloading-planned-workouts-from-the-api/93737>. Includes the server's Java `WorkoutDoc` class. | Primary (developer)                                                                                                               |
| **[D-47805]**  | David Tinker, "Compliance activity field" (2023-08-30): <https://forum.intervals.icu/t/compliance-activity-field/47805>                                                                                 | Primary (developer)                                                                                                               |
| **[D-40322]**  | David Tinker, "Paired Event ID" (2023-06-04): <https://forum.intervals.icu/t/paired-event-id/40322>                                                                                                     | Primary (developer)                                                                                                               |
| **[R-130971]** | A user's raw API response, 2026-08-11: <https://forum.intervals.icu/t/how-to-send-structured-workouts-with-repeats-and-pace-power-ranges-via-api/130971>                                                | Secondary, but it is verbatim server output                                                                                       |

The API is only partly documented. David said so himself: "Sorry the API docs are a bit sparse" ([D-609] #193). He also said in 2021 that he did not want `workout_doc` in the public API ([D-609] #56). It has been in the API since then, and in 2025 he published its class ([D-93737]). Still, treat `workout_doc` as a loosely versioned structure and parse it defensively.

**Units rule.** "The Intervals.icu back-end and API always uses m/s for speed, meters for distance, kg for weight and so on. Conversion to user specified units is done in the web app." ([D-609] #631, 2025-10-08). Durations are in seconds throughout.

---

## 1. Event (planned Workout)

Field names come from [SPEC] `components.schemas.Event`. Meanings and units come from the cited posts.

| Need                      | Field                                                                                                    | Type / unit                             | Notes                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                     | `name`                                                                                                   | string                                  |                                                                                                                                                                                                                 |
| Sport                     | `type`                                                                                                   | string, e.g. `"Ride"`, `"VirtualRide"`  |                                                                                                                                                                                                                 |
| Category                  | `category`                                                                                               | enum `WORKOUT`, `RACE_A/B/C`, `NOTE`, … | [SPEC]                                                                                                                                                                                                          |
| Indoor flag               | `indoor`                                                                                                 | boolean                                 | [SPEC]                                                                                                                                                                                                          |
| **Description / notes**   | `description`                                                                                            | string                                  | The **full workout text in builder syntax**: free text plus the step lines, e.g. `"These are horribly nasty.\n…\n- 20m 60% 90-100rpm\n\nMain set 4x\n- 8m 110%…"` ([D-609] #67).                                |
| Description without steps | `workout_doc.description`                                                                                | string                                  | Only the free-text part, with no step lines, e.g. `"A great session for building cycling specific strength…"` ([D-93737]). **This is the better field for a "notes" block.** It has a `description_locale` map. |
| **Planned load**          | `icu_training_load`                                                                                      | integer (load)                          | Calculated by parsing the description ([D-609] #67: `"icu_training_load": 116`).                                                                                                                                |
| **Planned intensity**     | `icu_intensity`                                                                                          | number, **percent** (IF × 100)          | [D-609] #67 shows `"icu_intensity": 86.04798` for a workout with an FTP-relative profile, which is IF 0.86. The unit is inferred from the example. [SPEC] does not state it.                                    |
| **Planned duration**      | `moving_time` (event) / `workout_doc.duration`                                                           | integer seconds                         | Both are present. The repo already uses `workout_doc.duration`.                                                                                                                                                 |
| **Planned distance**      | `distance` (event) / `workout_doc.distance`                                                              | float metres                            | Usually `0`/null for a time-based power ride. It is filled in for distance or pace workouts ([D-609] #428; [R-130971]: `"distance": 6134.3564`).                                                                |
| Planned work              | `joules`, `joules_above_ftp`                                                                             | integer joules                          | "planned workouts using power do have a joules field" ([D-609] #302). Divide by 1000 to get kJ.                                                                                                                 |
| Planned calories          | none                                                                                                     | —                                       | "You can't get expected calories from the API directly" ([D-609] #302).                                                                                                                                         |
| FTP used                  | `icu_ftp` (event); `workout_doc.ftp`                                                                     | integer W                               | `workout_doc.ftp`/`lthr`/`threshold_pace` are **the athlete's current sport settings**, filled in when `resolve=true` ([D-609] #428).                                                                           |
| Target metric             | `target` / `workout_doc.target`                                                                          | enum `AUTO`, `POWER`, `HR`, `PACE`      | [SPEC]; [D-93737]                                                                                                                                                                                               |
| Other                     | `strain_score`, `carbs_per_hour`, `tags`, `attachments`, `load_target`, `time_target`, `distance_target` |                                         | `*_target` fields exist in [SPEC] but have **no documented meaning**. Don't rely on them.                                                                                                                       |

### 1.1 `workout_doc` shape

The authoritative shape is the server's Java class, which David posted in [D-93737]:

```java
public class WorkoutDoc {
    public String description;
    public Map<String, String> description_locale;
    public Integer duration;
    public Float distance;
    public Integer ftp;
    public Integer lthr;
    public Float threshold_pace;    // meters/sec
    public String pace_units;       // SECS_100M, SECS_100Y, MINS_KM, MINS_MILE, SECS_500M
    public SportSettings sportSettings;
    public String category;
    public WorkoutTarget target;    // AUTO, POWER, HR, PACE
    public List<Step> steps;
    public List<Object> zoneTimes;  // sometimes array of ints otherwise array of objects
    public Map<String, String> options;
    public List<String> locales;

    public static class Step {
        public String text;                 // cue / label, e.g. "Welcome to the ..." or "6x" on a repeat
        public Map<String, String> text_locale;
        public Integer duration;            // seconds
        public Float distance;              // metres
        public Boolean until_lap_press;
        public Integer reps;                // set only on a repeat block
        public Boolean warmup;
        public Boolean cooldown;
        public String intensity;            // "active","rest","warmup","cooldown","recovery","interval","other"
        public List<Step> steps;            // children of a repeat block
        public Boolean ramp;                // start→end is a ramp, not a range
        public Boolean freeride;
        public Boolean maxeffort;
        public Value power;
        public Value hr;
        public Value pace;
        public Value cadence;
        public Boolean hidepower;
        // filled in with actual watts, bpm etc. when resolve=true is supplied
        public Value _power;
        public Value _hr;
        public Value _pace;
        public Float _distance;
    }

    public static class Value {
        public Double value;   // single target
        public Double start;   // range / ramp start
        public Double end;     // range / ramp end
        public String units;
        public String target;
        public Integer mmp_duration;
    }
}
```

Fields seen in 2026 responses but **missing from the class above**: `zoneTimes` objects (`{id, zone, name, color, max, minWatts, maxWatts, percentRange, secs}`), `hrZoneTimes` ([D-609] #67), and on the doc itself `average_watts`, `normalized_power`, `variability_index`, `polarization_index`, `strain_score` ([R-130971]). The extra doc-level metrics are undocumented. Their units are presumably watts, but this is unverified.

### 1.2 Targets (`Value.units`)

These `units` strings are confirmed in primary or verbatim sources:

| Target        | `units`        | Value semantics                 | Source                                            |
| ------------- | -------------- | ------------------------------- | ------------------------------------------------- |
| Power %FTP    | `"%ftp"`       | `value`, or `start`/`end`, in % | [D-609] #67, [D-93737]                            |
| Power zone    | `"power_zone"` | `value` = zone number           | [D-609] #386                                      |
| Cadence       | `"rpm"`        | `value` or `start`/`end`        | [D-609] #67, [D-93737]                            |
| Absolute pace | `"secs/km"`    | seconds per km                  | [R-130971]                                        |
| HR zone       | `"hr_zone"`    | `value` = zone number           | Community examples only (not developer-confirmed) |

The workout builder also accepts absolute watts, %MMP (hence `mmp_duration`), %HR, %LTHR, and %pace. I found **no primary source for the exact `units` strings** of those. An invalid unit falls back to `%ftp` silently: "there isn't all that much validation and 'ftp' isn't valid so it falls back to the default which is '%ftp'" ([D-609] #152).

- **Ramps**: `ramp: true` with `start`/`end` means a linear ramp. Without `ramp` the same fields mean a range ([D-93737] example: `"ramp": true, "power": {"start": 35, "end": 55, "units": "%ftp"}`).
- **Resolved values**: with `resolve=true`, each step also gets `_power` / `_hr` / `_pace` in **watts / bpm / m/s**. This works even for zone targets: `"power": {"value": 2, "units": "power_zone"}, "_power": {"start": 162, "end": 217}` ([D-609] #386, #426). Outdoor workouts turn a fixed power into a ±2.5% range (HR ±1.5%). The `powerRange` / `hrRange` / `paceRange` query params control this, and `0.0` disables it ([D-609] #389).

### 1.3 Repeats are **nested, not expanded**

A repeat is a parent step with `reps`, a `text` label such as `"6x"`, and child `steps[]`. **The parent's `duration` (and `distance`) is the total across all reps.** Child durations are for a single rep.

From a downloaded workout ([D-609] #129, 2022):

```json
{
  "reps": 6,
  "text": "6x",
  "steps": [
    { "duration": 120, "power": { "value": 98, "units": "%ftp" } },
    { "duration": 120, "power": { "value": 43, "units": "%ftp" } }
  ],
  "duration": 1440
}
```

The same shape appears in a verbatim 2026 API response ([R-130971]): `{"reps":2,"text":"2x","steps":[{…"duration":220},{…"duration":120}],"distance":2720.43,"duration":680}`. In both, the parent duration is `reps × Σ child durations`. The Java class confirms it with `Integer reps` and a recursive `List<Step> steps`.

> **Impact on existing code:** `lib/intervalsApi.ts` (`IntervalsWorkoutDoc.steps`) and `lib/workoutProfile.ts` (`WorkoutStep`) both claim "repeats already expanded". That is not what the API returns. A repeat block has no `power`, so `buildWorkoutProfile` drops it as undrawable but still counts its full duration in `totalSeconds`. For an interval session where the main set is most of the ride, the drawable share falls below 50% and **the Calendar's Workout Profile comes out empty**. Any Workout Details step list must flatten (or render) nested repeats. The same fix will likely help the Calendar.

### 1.4 Does the list endpoint omit `workout_doc` / `description`?

**No.** `GET /athlete/{id}/events` returns the full `Event` schema ([SPEC]). The list endpoint has no `fields` projection parameter. David's list example includes both `description` and `workout_doc` ([D-93737]), and so does the bulk response in [R-130971]. The list endpoint actually has **more** options than the single-event endpoint:

- `GET /athlete/{id}/events{format}` query params ([SPEC]): `oldest`, `newest` (default: today to +6 days), `category` (e.g. `WORKOUT`), `limit`, `calendar_id`, `ext` (adds `workout_filename`/`workout_file_base64`), `powerRange`/`hrRange`/`paceRange`, `locale`, and **`resolve`** (default false).
- `GET /athlete/{id}/events/{eventId}` ([SPEC]: "Get an event (planned workout, note etc.)"; [D-609] #4: "Fetch an event by id.") takes **only** the path params. The spec lists no `resolve`. **If resolved watts (`_power`) are needed, use the list endpoint for that day with `resolve=true`.** Otherwise the single-event endpoint returns the same `Event` body.

---

## 2. Activity (cycling)

Field names come from [SPEC] `components.schemas.Activity`. Units follow the m / m/s / s rule ([D-609] #631) unless noted otherwise.

| Need                  | Field                                                                                                                | Unit                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Moving time           | `moving_time`                                                                                                        | s                                                                                                                           |
| Elapsed time          | `elapsed_time`                                                                                                       | s (also `icu_recording_time`, `coasting_time`)                                                                              |
| Distance              | `distance`                                                                                                           | m (`icu_distance` also exists; its exact difference is undocumented)                                                        |
| Load                  | `icu_training_load`                                                                                                  | load (also split into `power_load`, `hr_load`, `pace_load`, plus `trimp`)                                                   |
| Avg power             | `icu_average_watts`                                                                                                  | W                                                                                                                           |
| Normalized power      | `icu_weighted_avg_watts`                                                                                             | W. intervals.icu's "Normalized Watts" (forum: <https://forum.intervals.icu/t/normalised-watts-weighted-average-power/7464>) |
| Intensity factor      | `icu_intensity`                                                                                                      | % (IF × 100). Inferred from the Event example and per-interval `"intensity": 112` ([D-609] #14).                            |
| Variability index     | `icu_variability_index`                                                                                              | ratio                                                                                                                       |
| FTP used for the ride | `icu_ftp`                                                                                                            | W                                                                                                                           |
| Avg / max HR          | `average_heartrate` / `max_heartrate`                                                                                | bpm (`has_heartrate` boolean)                                                                                               |
| Cadence               | `average_cadence`                                                                                                    | rpm                                                                                                                         |
| Elevation             | `total_elevation_gain` / `total_elevation_loss`                                                                      | m (`min/max/average_altitude` too)                                                                                          |
| Calories              | `calories`                                                                                                           | kcal                                                                                                                        |
| Work                  | `icu_joules`                                                                                                         | J (÷1000 = kJ); also `icu_joules_above_ftp`                                                                                 |
| Speed                 | `average_speed` / `max_speed`                                                                                        | m/s                                                                                                                         |
| Time in zones         | `icu_zone_times` (array of `{id, secs}`), `icu_hr_zone_times` (int[] s)                                              | s                                                                                                                           |
| RPE / feel            | `icu_rpe`, `feel`, `session_rpe`                                                                                     |                                                                                                                             |
| Plan link             | `paired_event_id`                                                                                                    | integer Event id                                                                                                            |
| Compliance            | `compliance`                                                                                                         | %. See §4.                                                                                                                  |
| Other                 | `trainer`, `decoupling`, `icu_efficiency_factor`, `polarization_index`, `strain_score`, `description`, `device_name` |                                                                                                                             |

Post-ride notes and comments are **not** a field. They are messages, read with `GET /activity/{id}/messages` ([D-609] #186; <https://forum.intervals.icu/t/119046>).

### 2.1 Strava caveat (important)

Activities that arrived **via Strava come back as stubs**: `{id, icu_athlete_id, start_date_local, source: "STRAVA", _note: "STRAVA activities are not available via the API"}`. They have **no metrics and no `paired_event_id`**. [SPEC] says "An empty stub object is returned for Strava activities" on both the list and the single endpoints, and its `Hidden` schema matches. The stub was observed in [D-609] #498, and David explains the Strava terms constraint in #504. For a Strava-only athlete, a completed Workout therefore can't be paired from the API and the actual-side metrics are unavailable. The Details screen needs a degraded state for this.

---

## 3. Endpoints and pairing

| Endpoint                             | Returns                                                                                                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /athlete/{id}/events{format}`   | `Event[]`, full objects including `description` and `workout_doc`. Supports `resolve`, `category`, etc. ([SPEC])                                                                                                                              |
| `GET /athlete/{id}/events/{eventId}` | One `Event`, same schema. **Exists.** No `resolve` param. ([SPEC]; [D-609] #4)                                                                                                                                                                |
| `GET /athlete/{id}/activities`       | `Activity[]`. **All fields by default.** `fields=` projects and also drops nulls. `oldest` is **required**. Returns no intervals. ([SPEC])                                                                                                    |
| `GET /activity/{id}`                 | One `Activity`. **Exists.** With `?intervals=true` it becomes `ActivityWithIntervals`, which adds only `icu_intervals` and `icu_groups` (per-interval avg/max watts, HR, cadence, `intensity`, `training_load`, …) ([SPEC]; [D-609] #14, #71) |
| `GET /athlete/{id}/activities/{ids}` | Several activities by id, also with `intervals=` ([SPEC])                                                                                                                                                                                     |

The single-activity endpoint returns nothing beyond the list endpoint except the optional intervals. The repo's current calendar call uses a `fields=` projection, so a Details screen needs either a fuller projection or the single fetch.

**`paired_event_id`.** It lives **only on the Activity** and points to the Event id. "That refers to an event (workout or note etc. on your calendar)" ([D-40322]). "There is a field on activity 'paired_event_id' that is the ID of the paired workout if any. Pairing is done automatically if the workout matches the activity closely enough (sport and load/time) and can also be done manually (drag and drop)" ([D-609] #164). **The `Event` schema has no reverse field** ([SPEC]: no activity id on `Event`). To get the Activity for a Workout:

1. List activities for the Workout's date (`oldest=newest=<date>`; widen by a day for timezone edges if needed).
2. Take the one with `paired_event_id === event.id`. That list item already holds every summary field.
3. Only call `GET /activity/{id}?intervals=true` if per-interval data is wanted.

Workouts are copies: "the events are a separate copy of the workout" ([D-40322] #4). Editing a library workout does not change scheduled Events.

---

## 4. Planned vs actual: what compares directly

| Metric                                  | Planned (Event)                                                                  | Actual (Activity)                              | Comparable?                                                                                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duration                                | `moving_time` or `workout_doc.duration` (s)                                      | `moving_time` (s)                              | **Yes**                                                                                                                                                                                                                                  |
| Distance                                | `distance` / `workout_doc.distance` (m)                                          | `distance` (m)                                 | **Yes, but only when planned is non-zero** (usually 0 for time-based rides)                                                                                                                                                              |
| Load                                    | `icu_training_load`                                                              | `icu_training_load`                            | **Yes.** Same model. intervals.icu's own compliance is `load × 100 / planned load` ([D-47805])                                                                                                                                           |
| Intensity (IF %)                        | `icu_intensity`                                                                  | `icu_intensity`                                | **Yes**, same scale. Planned uses the FTP at plan time, actual uses the activity's `icu_ftp`.                                                                                                                                            |
| Work                                    | `joules` (J)                                                                     | `icu_joules` (J)                               | **Yes** (power workouts)                                                                                                                                                                                                                 |
| Work above FTP                          | `joules_above_ftp`                                                               | `icu_joules_above_ftp`                         | **Yes**                                                                                                                                                                                                                                  |
| Strain                                  | `strain_score`                                                                   | `strain_score`                                 | Likely. Same name, semantics undocumented.                                                                                                                                                                                               |
| Time in zones                           | `workout_doc.zoneTimes` (int[] or objects)                                       | `icu_zone_times` (`{id, secs}[]`)              | Same meaning, **different shapes**. Needs normalising.                                                                                                                                                                                   |
| Avg / normalized power                  | `workout_doc.average_watts` / `normalized_power` (undocumented)                  | `icu_average_watts` / `icu_weighted_avg_watts` | Plausible but **unverified**. Treat as optional.                                                                                                                                                                                         |
| Compliance                              | —                                                                                | `compliance` (%)                               | Ready-made: `< 0` = "ignore compliance", `null` = not calculated (no planned workout for the sport that week), unpaired activities in a planned week = 0 ([D-47805]). Colour bands: 80–120% green, 50–150% orange, else red ([D-47805]). |
| HR, cadence, elevation, calories, speed | No planned aggregate (only per-step targets; no expected calories, [D-609] #302) | Present                                        | **No** (actual-only)                                                                                                                                                                                                                     |

## Open / unverified

- The exact `units` strings for watts, %HR, %LTHR, %MMP, and pace-percent targets. Get them by fetching a real workout that uses each.
- Units of `workout_doc.average_watts` / `normalized_power`, and what `Event.load_target` / `time_target` / `distance_target` mean.
- `icu_intensity` being a percentage comes from examples, not documentation.
