# What the Intervals.icu Wellness API returns

Research for #237 (map #236). The question: what does the Intervals.icu Wellness API actually give us for a compact, read-only, source-agnostic morning card on Home?

All sources were fetched on **2026-11-01**. No authenticated calls were made, so nothing here was observed on a live account. **C** = confirmed: stated by the linked primary source (the OpenAPI spec, the Intervals.icu developer, or the device vendor's own API docs). **I** = inferred: my reading, or user reports and other secondary sources only.

## Short answer

- One list call gives everything the card needs: `GET /api/v1/athlete/{id}/wellness?oldest=…&newest=…` returns today and the baseline window together. **C**
- Sleep duration, HRV, resting HR, sleep score and readiness all exist as fields, but every field is optional and the API does not say which device filled it. **C**
- `hrv` (rMSSD) and `hrvSDNN` are separate fields, and they must never be blended. **C**
- `readiness` has no shared scale: Polar writes 1–6, and other sources write something else. **C** for Polar, **I** for the rest. Compare it only to the athlete's own history.
- A morning card will often find nothing yet. WHOOP is polled about every 8 hours, and Garmin pushes at no fixed time. **C**
- **Garmin may disappear from this API.** Garmin's new terms mean Intervals.icu expects to block Garmin data for API clients. For wellness specifically, the developer's latest word (2026-10-24) is "not sure". **C**

## Sources

| Short name       | URL                                                                                                          | Notes                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| OpenAPI spec     | https://intervals.icu/api/v1/docs                                                                            | Primary. The JSON behind https://intervals.icu/api-docs.html, version `v1.0.0`. Field entries have no descriptions. |
| API thread       | https://forum.intervals.icu/t/api-access-to-intervals-icu/609                                                | Developer (`david`) posts cited by post number. Others in the thread are users.                                     |
| Wellness model   | https://forum.intervals.icu/t/best-way-to-integrate-apple-watch-apple-health-data-into-intervals-icu/5776/12 | Developer post, 2022-06-15. The field list with code comments for units and scales.                                 |
| Script model     | https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781/16                                    | Developer post, 2023-07-08. Same model: `hrv ~ rMSSD`.                                                              |
| OAuth post       | https://forum.intervals.icu/t/intervals-icu-oauth-support/2759                                               | Developer post, updated through 2026.                                                                               |
| HRV fields post  | https://forum.intervals.icu/t/hrv-wellness-fields/2754                                                       | Developer post, 2021-01-30.                                                                                         |
| WHOOP post       | https://forum.intervals.icu/t/whoop-integration-added/69075                                                  | Developer post, 2024-06-11, plus thread replies.                                                                    |
| Polar mapping    | https://forum.intervals.icu/t/polar-flow-wellness-hr-import/46476                                            | Developer post, 2023-08-14.                                                                                         |
| Polar AccessLink | https://www.polar.com/accesslink-api/swagger.yaml                                                            | Polar's own schema, with scales and units.                                                                          |
| Wellness feature | https://www.intervals.icu/features/wellness/                                                                 | Lists the auto-sync sources.                                                                                        |

Other forum threads are linked where they are used. The current text of Garmin's agreement was not read; clause 5.1(o) below is a forum user's quotation of it.

## 1. Endpoints

| Call                                                                   | Purpose                  | Status |
| ---------------------------------------------------------------------- | ------------------------ | ------ |
| `GET /api/v1/athlete/{id}/wellness{ext}?oldest=&newest=&fields=&cols=` | List a date range        | **C**  |
| `GET /api/v1/athlete/{id}/wellness/{date}`                             | One "local ISO-8601 day" | **C**  |

- `{ext}` is a required path parameter in the spec, and `.csv` selects CSV. The developer's own JSON example uses plain `/wellness`, so an empty extension is JSON. **C**
- `oldest` and `newest` are optional local ISO-8601 dates, and `newest` is inclusive. **C**
- `fields` limits the returned keys and "also excludes null values". `cols` is the CSV equivalent. **C**
- The record's `id` is the local date, for example `"2020-12-01"`. **C**
- Auth is a Bearer token from OAuth. The relevant scope is `WELLNESS:READ`. **C** (OAuth post)
- Everything else on `/wellness` writes data and is out of scope.

## 2. Fields

The spec gives names and types only. Units and scales come from the developer's model post unless marked otherwise. All are optional: the spec's `Wellness` schema has no `required` list. **C**

### Core for a morning check-in

| Field           | Type    | Meaning and unit                               | Status                                                                                                                                                                                                 |
| --------------- | ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sleepSecs`     | integer | Sleep duration in seconds                      | **C** ([28620 shown as 7h57m](https://forum.intervals.icu/t/sleep-hours-not-correct/38432))                                                                                                            |
| `sleepScore`    | float   | Device sleep score. No scale stated            | **C** type, **I** meaning                                                                                                                                                                              |
| `sleepQuality`  | integer | Subjective: Excellent 1, Good 2, Avg 3, Poor 4 | **C**. Lower is better                                                                                                                                                                                 |
| `avgSleepingHR` | float   | Average sleeping HR, bpm                       | **C** field, **I** unit                                                                                                                                                                                |
| `hrv`           | float   | rMSSD, ms                                      | **C** rMSSD ([model](https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781/16)), **I** ms. Accepted range 1–1000 ([post](https://forum.intervals.icu/t/coros-support-added/37006/30)) |
| `hrvSDNN`       | float   | SDNN, ms                                       | **C** SDNN, **I** ms                                                                                                                                                                                   |
| `restingHR`     | integer | Resting HR, bpm                                | **C** field, **I** unit                                                                                                                                                                                |
| `readiness`     | float   | Device or app readiness. No shared scale       | **C** type; see section 4                                                                                                                                                                              |
| `respiration`   | float   | Breaths per minute                             | **C** field, **I** unit                                                                                                                                                                                |
| `spO2`          | float   | 0–100 %                                        | **C**                                                                                                                                                                                                  |

### Subjective, usually hand-entered

| Field                           | Scale                                                        | Status                 |
| ------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `soreness`, `fatigue`, `stress` | None 0, Low 1, Avg 2, High 3, Extreme 4                      | **C**. Higher is worse |
| `mood`, `motivation`            | Excellent 1, Good 2, Avg 3, Poor 4                           | **C**. Lower is better |
| `injury`                        | Excellent 1, Niggle 2, Poor 3, Injured 4                     | **C**. Lower is better |
| `hydration`                     | Well Hydrated 1, Hydrated 2, Dehydrated 3, Very Dehydrated 4 | **C**. Lower is better |

These integers do not read as "bigger is better". Any comparison has to carry that direction per field.

### Everything else

| Field                                       | Type and unit                                                                             | Status                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| `weight`                                    | float, kg                                                                                 | **C**                     |
| `bodyFat`, `abdomen`                        | float, %, cm                                                                              | **C**                     |
| `systolic`, `diastolic`                     | integer, mmHg                                                                             | **C**                     |
| `bloodGlucose`, `lactate`                   | float, mmol/L                                                                             | **C**                     |
| `vo2max`                                    | float, ml/kg/min                                                                          | **C**                     |
| `baevskySI`                                 | float, Baevsky stress index                                                               | **C** type, **I** meaning |
| `hydrationVolume`                           | float, litres consumed                                                                    | **C**                     |
| `kcalConsumed`                              | integer                                                                                   | **C**                     |
| `carbohydrates`, `protein`, `fatTotal`      | float, [grams](https://forum.intervals.icu/t/capture-carbs-protein-and-fat-intake/122594) | **C**                     |
| `steps`, `floorsClimbed`                    | integer                                                                                   | **C**                     |
| `menstrualPhase`, `menstrualPhasePredicted` | `PERIOD`, `FOLLICULAR`, `OVULATING`, `LUTEAL`, `NONE`                                     | **C**                     |
| `comments`                                  | string                                                                                    | **C**                     |
| `id`, `updated`                             | local date string, UTC timestamp                                                          | **C**                     |
| `locked`, `tempWeight`, `tempRestingHR`     | boolean. Undocumented                                                                     | **C** type only           |

### Fitness / Fatigue / Form (out of scope for the card)

`ctl` (fitness), `atl` (fatigue), `rampRate`, `ctlLoad`, `atlLoad`, and `sportInfo[]` with `type`, `eftp`, `wPrime`, `pMax`. **C** There is no Form field; it is derived as `ctl - atl`. **C** absent from the schema, **I** formula. These live on the same record, which matters for missing-day handling below.

## 3. Missing data and date ranges

| Case                               | Behaviour                                                                                                                                                                     | Status |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Missing field, no `fields` param   | Key present with `null`, as in the [developer's example](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/34)                                                    | **C**  |
| Missing field, with `fields` param | Key absent, because `fields` "also excludes null values"                                                                                                                      | **C**  |
| Partly filled day                  | Normal. The developer describes a day with [only weight and resting HR](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/52)                                     | **C**  |
| Day with no data, in a range       | Unclear. A [2021 user report](https://forum.intervals.icu/t/api-access-to-intervals-icu/609?page=5) describes other days as "null", which could mean rows of nulls or no rows | **I**  |
| Day with no data, single-day read  | **Not established.** The spec documents only `200`, and no post says whether a missing day gives `404` or an empty record                                                     | —      |
| No `oldest` / `newest`             | Undocumented. The same report saw "close to 2 months"                                                                                                                         | **I**  |
| Result order, range cap            | Undocumented                                                                                                                                                                  | —      |
| Missing `WELLNESS:READ` on a token | **Not established.** No source gives the status code                                                                                                                          | —      |

Consequences for the client:

- Treat "no row", "row of nulls" and "key absent" as the same thing, because all three can occur. **I**
- A row existing does not prove wellness data exists. Records also carry `ctl` and `atl`, so a row could hold only those. **I** "Today has data" should mean a displayed field is non-null.
- Find today's row by matching `id`, not by position, and always send both range bounds. **I**
- Prefer the list call over the single-day read. It avoids the unknown missing-day response and also returns the baseline. **I**

"Today" is the athlete's local date. The app's date and Intervals.icu's can disagree when an athlete travels; no source covers this. **I**

## 4. Which source fills what, and does it mean the same thing

**The API has no per-field source attribute.** Nothing in `Wellness` says which device wrote a value, so the card cannot label a value by device or normalise by source. **C** (schema)

**Sources overwrite each other.** A value is last-writer-wins per field:

- WHOOP: "Whatever wellness fields you select will replace old data from Garmin and other sources." [**C**](https://forum.intervals.icu/t/whoop-integration-added/69075)
- Polar vs HRV4Training: which one wins "depends on the timing". [**C**](https://forum.intervals.icu/t/import-hrv4training-data-from-dropbox/5078/48)
- Garmin `dailies` and `healthSnapshot` both set resting HR, at different times of day. [**C**](https://forum.intervals.icu/t/wellness-data-random-overriding/26202)

So a single athlete's history can mix sources, sometimes within one field. A baseline compares like with like only if the athlete's setup is stable. Users report this making trends unusable. **I** (same thread)

### Fill matrix

Athletes tick which metrics to sync per source, so any cell can be empty for a given athlete. **C** "No" below means the source does not normally fill it.

| Field           | WHOOP (native)                          | Garmin (native)                                                                                         | Apple Watch (third-party app only)                                                                            | Polar (native)                          |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `sleepSecs`     | Yes **C**                               | Yes **C**                                                                                               | Yes, app-dependent **C**                                                                                      | Yes **I** (user reports)                |
| `sleepScore`    | Probably, WHOOP sleep performance **I** | Yes, [Garmin sleep score](https://forum.intervals.icu/t/hrv-wellness-fields/2754/13) **I**, 0–100 **I** | Only if an app computes its own **C**                                                                         | Yes **I**; Polar's scale is 1–100 **C** |
| `hrv`           | Yes, rMSSD **C**                        | Yes, `lastNightAvg` **C**, assumed rMSSD **I**                                                          | No, unless the app computes rMSSD itself **C**                                                                | Yes, RMSSD in ms **C**                  |
| `hrvSDNN`       | No **I**                                | Health Snapshot only **I**                                                                              | Yes, Apple's native metric **C**                                                                              | No **I**                                |
| `restingHR`     | Yes **C**                               | Yes, from `dailies` and `healthSnapshot` **C**                                                          | App-dependent; [HealthFit once sent none](https://forum.intervals.icu/t/auto-filled-resting-hr/52568/6) **C** | Yes, but it is the sleep average **C**  |
| `readiness`     | Yes, WHOOP recovery **I**               | **No** in the standard sync **I**                                                                       | Only if an app computes its own **C**                                                                         | Yes, `nightly_recharge_status` **C**    |
| `avgSleepingHR` | Unknown                                 | Not delivered, per a third-party tool **I**                                                             | App-dependent **I**                                                                                           | Yes, `heart_rate_avg` **C**             |
| `respiration`   | Yes **C**                               | Not delivered, per a third-party tool **I**                                                             | App-dependent **I**                                                                                           | Unknown                                 |
| `spO2`          | Yes **C**                               | Health Snapshot **C**                                                                                   | App-dependent **I**                                                                                           | Unknown                                 |

Notes:

- **Apple has no native sync.** Apple Health data reaches Intervals.icu only through third-party iOS apps such as HealthFit, BreakAway, IntervalsWellnessSync or Intervals Companion. [**C**](https://www.intervals.icu/features/wellness/) Each app chooses what to write. Apple Watch fill is therefore a property of the app, not of the watch.
- **Polar syncing is flaky.** Users have reported HRV stopping for months in 2025, and only sleep fields arriving in 2024. **I**
- **Garmin partial syncs happen.** A [May 2026 report](https://forum.intervals.icu/t/garmin-wellness-partial-sync-sleep-works-rhr-hrv-steps-missing/130093) has only sleep score arriving. **I**

### Is it comparable across sources?

| Field        | Comparable?        | Why                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hrv`        | Roughly            | Meant to be rMSSD everywhere, but windows differ: Polar uses a 4-hour window starting 30 minutes after falling asleep **C**. Garmin's docs do not state the metric: "Hopefully that is what it is because the Garmin docs don't say." [**C**](https://forum.intervals.icu/t/hrv-is-missing-from-garmin-wellness-data/16623/3) Coros was [also an assumption](https://forum.intervals.icu/t/coros-support-added/37006/30). |
| `hrvSDNN`    | **Not with `hrv`** | A different statistic. Apple uses SDNN "instead of rMSSD like just about everyone else." [**C**](https://forum.intervals.icu/t/healthfit-sync-for-activities-and-health-metrics/2718/4) Absolute values do not transfer between the two. **I**                                                                                                                                                                            |
| `restingHR`  | No                 | Polar writes the sleep-window **average** into it **C**. WHOOP and Garmin use their own definitions **I**. Morning spot values also appear. **I**                                                                                                                                                                                                                                                                         |
| `sleepSecs`  | Mostly             | Duration in seconds, but sources differ on awake time. [Coros sends time in bed](https://forum.intervals.icu/t/sleep-hours-not-correct/38432). **I**                                                                                                                                                                                                                                                                      |
| `sleepScore` | **No**             | Each vendor's own algorithm, sometimes the sync app's own. Polar: 1–100 **C**. Garmin: 0–100 **I**. WHOOP: a percentage **I**. Apple: [app-computed](https://forum.intervals.icu/t/intervalswellnesssync-simple-apple-watch-health-data-sync-to-intervals-icu/125843) **C**.                                                                                                                                              |
| `readiness`  | **No**             | Different scales. Polar: [integer 1–6](https://www.polar.com/accesslink-api/swagger.yaml) from very poor to very good, and the mapping is [confirmed](https://forum.intervals.icu/t/how-is-readiness-calculated/8491/8) **C**. WHOOP recovery: 0–100 **I**. Oura: 0–100 **I**. HRV4Training-style values: [around 7.4](https://forum.intervals.icu/t/hrv4training-import/10481/2) **I**. Manual entry is also possible.   |

A neutral comparison to the athlete's own baseline does not need a shared scale, so it survives all of this. An absolute label does not: "3" means compromised on Polar and almost nothing on a 0–100 scale.

## 5. When an entry lands

There is **no documented schedule** for any source.

| Source      | How it arrives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| WHOOP       | "Intervals.icu polls Whoop for new data every 8 hours or so", and also when the calendar page is first opened after reloading the app ([2025 and 2026 posts](https://forum.intervals.icu/t/whoop-integration-added/69075?page=6)). Users have seen [half a day of delay](https://forum.intervals.icu/t/whoop-data-delayed-to-site/93453); WHOOP [raised the rate limits](https://forum.intervals.icu/t/whoop-data-delayed-to-site/93453/2) in April 2025.                                       | **C**                    |
| Garmin      | "Garmin sends the data to the webhook endpoint asynchronously"; different data types arrive [at different times of day](https://forum.intervals.icu/t/wellness-data-random-overriding/26202). It needs the watch to sync first. **I** One user's [morning record](https://forum.intervals.icu/t/futureweb-intervals-mcp-open-source-mcp-server-for-chatgpt-claude-coaching-analytics-all-custom-fields-streams-sign-in-with-intervals-icu/132899/2) was still marked preliminary at 12:27 CEST. | **C** push, **I** timing |
| Apple Watch | Whenever the iOS app runs. IntervalsWellnessSync wakes at a configured time, and "iOS may delay or skip the wake". HealthFit behaviour varies. Timing is the app's, so effectively unknown.                                                                                                                                                                                                                                                                                                     | **I**                    |
| Polar       | When the watch [syncs with Polar Flow](https://forum.intervals.icu/t/polar-flow-sleep-and-nightly-recharge-data/59709), described as daily.                                                                                                                                                                                                                                                                                                                                                     | **I**                    |

Two further points:

- Reading the API probably does not trigger a WHOOP poll. The developer describes the trigger as the Intervals.icu calendar page. **I**
- Date attribution is undocumented. Sleep appears to land on the wake-up date, since the morning check-in above shows last night's sleep as today. **I** The date can also be wrong per source: [Oura readiness once landed a day late](https://forum.intervals.icu/t/readiness-score-from-oura-uploads-to-the-next-day/55405), which was a bug the developer fixed. **C**

An empty card in the morning is therefore a routine state, not an error, and it will be longest for WHOOP athletes.

## 6. Garmin may leave the API

This is the finding most likely to change the map.

| Date       | Statement                                                                                                                                                                                                                                                                                    | Status |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-10-09 | "It is likely that we will have to block access to Garmin data via the API soon." ([#752](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/752))                                                                                                                                | **C**  |
| 2026-10-09 | Asked whether wellness fields, derived values and timelines are affected: "mostly we do not have answers for yet." ([#759](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/759))                                                                                               | **C**  |
| 2026-10-24 | Apps using Intervals.icu as a bridge will be limited: "Yes. You need to get your own connection to Garmin to get activity data… Not sure what is going to happen with wellness data and uploading workouts yet." ([#883](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/883)) | **C**  |
| 2026-10-26 | Derived endpoints: "Probably/maybe but none of this has been finalised yet." ([#890](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/890))                                                                                                                                     | **C**  |

The clause cited by a forum user is 5.1(o) of the Connect Developer Program Agreement, which bars passing end-user data to third-party services Garmin has not approved. [**I**](https://forum.intervals.icu/t/api-access-to-intervals-icu/609/755) (not read directly) No date, and no decision on wellness, had been published by the last post read (2026-10-28).

If wellness is blocked, a Garmin athlete's fields would presumably read as null or go missing, which looks exactly like "no data today". **I** The card could not tell the two apart, and no response shape has been announced. **I** The same announcement covers **activity** data, so the block can reach the app's existing Intervals.icu reads, not just this card. **C** for the direction, **I** for the effect here.

## 7. What this means for the map

These are recommendations, and the decisions stay with the map.

- **Fetch:** one list call, `oldest = today − N`, `newest = today`, with `fields` set to the card's fields. It gives today and the baseline in one ADR 0005 query. **I**
- **Fields:** `sleepSecs`, `hrv` or `hrvSDNN`, and `restingHR` are the reliable core. `sleepScore` and `readiness` are unitless and optional, shown only with no absolute label or colour scale. **I**
- **HRV:** show whichever of the two fields is present and keep each baseline separate. If both exist, prefer `hrv`. **I**
- **Baseline:** compute per field from the athlete's own history, as a relative difference, with a minimum sample count. It can silently mix sources, so keep the wording neutral. **I**
- **Empty state:** make it a normal morning state that doesn't imply a problem. It must not suggest the athlete did something wrong. **I**
- **Partial state:** the card has to render any subset of its fields. **I**
- **Scope:** `hooks/useIntervalsAuth.ts:21` requests `ACTIVITY:READ,CALENDAR:READ`, so `WELLNESS:READ` is new. Athletes can [deselect scopes](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759) in the consent dialog, so a new connection can also lack it. **C** The token response lists granted scopes, and `functions/src/intervals/exchangeToken.ts:60` already stores `scope` on the integration document, so the app can detect a missing scope without probing. **C** Whether stored scopes reflect later changes is unknown. **I**

## Could not establish

- The exact response to a single-day read for a date with no record.
- Whether a no-data day in a range is a row of nulls or no row.
- The HTTP status when a token lacks `WELLNESS:READ`.
- The native WHOOP mapping for `sleepScore` and `readiness`. User posts point to [sleep performance](https://forum.intervals.icu/t/whoop-api-available-refer-whoop-thread/20700/57) and [recovery](https://forum.intervals.icu/t/whoop-integration-added/69075?page=6), but the first predates the native integration.
- Exactly what Garmin's `lastNightAvg` measures.
- Exact sync times for any source, and the official rule for which date a night's sleep lands on.
- Whether Garmin wellness will be blocked, when, and how a blocked field will look.

The first three can be settled with one authenticated call on a real account. That is worth doing before the spec is sliced.
