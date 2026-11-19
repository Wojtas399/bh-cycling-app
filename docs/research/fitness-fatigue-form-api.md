# Where Intervals.icu exposes Fitness, Fatigue and Form

Research for #243 (map #242). The question: which endpoints return these values, under which OAuth scope, for which dates, and how does Intervals.icu itself present them?

All sources were fetched on **2026-11-01**. No authenticated calls were made, so nothing here was observed on a live account. **C** = confirmed: stated by a linked primary source (the OpenAPI spec, the Intervals.icu developer `david`, or Intervals.icu's own shipped web code). **I** = inferred: my reading, or user reports only. **Unknown** = no source found.

The API terms CTL (`ctl`), ATL (`atl`) and TSB mean Fitness, Fatigue and Form. They appear here only for field mapping.

## Short answer

- **Endpoint:** `GET /api/v1/athlete/{id}/wellness?oldest=…&newest=…&fields=id,ctl,atl,rampRate` returns one record per day. It is the same endpoint the Wellness map uses. **C**
- **Scope:** `WELLNESS:READ` is required for that endpoint. **C** `ACTIVITY:READ` and `CALENDAR:READ` do not cover it. They only expose `icu_ctl` and `icu_atl` on individual Activities and events, which leaves gaps on other days. **C** for the fields, **I** that this rules them out. So this map depends on the #236 decision about gaining the scope.
- **History:** there is no documented limit on range length. One call covers the range. Result order and any range cap are undocumented. **C** for the absence of documentation
- **Today and future:** both are available. Future dates return projected values from the same call by setting `newest` to a future date. **C** (developer post from 2022, with a user confirming it worked)
- **Projected values are cheap.** They need no extra endpoint and no extra scope beyond `WELLNESS:READ`. However, nothing in a record marks a value as projected. **C** for the schema
- **Today's value** includes today's completed load, calculated "on the day", not the TrainingPeaks previous-day way. **C** Whether it also includes a planned Workout not yet ridden is **not established**, and evidence leans towards yes. **I**
- **Form is not stored on the daily record.** The web app derives it as Fitness minus Fatigue. **C** This conflicts with the map's "BH Cycling never calculates them": a daily Form needs that one subtraction. See [Consequences](#consequences-for-the-spec).
- **Form zones** are fixed at -30, -10, +5 and +20, and the same numbers apply to Form %. **C** (web code)
- **Custom time constants** are already included in the returned values, so the app does nothing with them. **C** for the mechanism, **I** for the consequence

## Sources

| Short name       | URL                                                                                                                                     | Notes                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OpenAPI spec     | https://intervals.icu/api/v1/docs                                                                                                       | Primary. The JSON behind https://intervals.icu/api-docs.html, `v1.0.0`. It says nothing about scopes.              |
| Cookbook         | https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090                                                              | Developer post, 2024-11-20.                                                                                        |
| OAuth post       | https://forum.intervals.icu/t/intervals-icu-oauth-support/2759                                                                          | Developer post. Scope list.                                                                                        |
| Future data      | https://forum.intervals.icu/t/fitness-form-fatigue-load-over-api-calls/25042                                                            | Developer answer, 2022-12-08, and the asker's confirmation, 2022-12-09.                                            |
| Calendar updates | https://forum.intervals.icu/t/calendar-and-fitness-updates/5551                                                                         | Developer post, 2021-12-17.                                                                                        |
| Fitness guide    | https://forum.intervals.icu/t/fitness-page-a-guide-to-getting-started/17702                                                             | User guide with developer replies, 2022–2023.                                                                      |
| Form % post      | https://forum.intervals.icu/t/form-as-a-percentage-of-fitness/869                                                                       | Developer announcement, 2020-05-08.                                                                                |
| Zones post       | https://forum.intervals.icu/t/zones-of-form-in-fitness-chart/3623                                                                       | Developer reply, 2021-04-12.                                                                                       |
| Factors post     | https://forum.intervals.icu/t/change-fatigue-atl-and-fitness-ctl-factors/300                                                            | Developer posts, 2020–2023.                                                                                        |
| API thread       | https://forum.intervals.icu/t/api-access-to-intervals-icu/609                                                                           | First post (`david`) has the rate limits. Others cited by post number.                                             |
| Web code         | https://intervals.icu/assets/Fitness-D0MJETiq.js, `FormChartD3-BbJ-fx2S.js`, `FitnessPage-CG7l1cW6.js`, `index-CRhpyRZN.js`             | Public, minified bundle of Intervals.icu's own app. These names change with each release, and the logic could too. |
| Friel            | https://joefrieltraining.com/2015/12/managing-training-using-tsb.html                                                                   | The origin of the zones.                                                                                           |
| Repo notes       | [`docs/research/wellness-api.md`](https://github.com/Wojtas399/bh-cycling-app/blob/research/wellness-api/docs/research/wellness-api.md) | #237. Covers the same endpoint's missing-data behaviour. Not repeated here.                                        |

## 1. Endpoints

| Where                                                     | Fields                                                        | Granularity                               | Fit for this feature                 | Status |
| --------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------ | ------ |
| `GET /athlete/{id}/wellness{ext}?oldest=&newest=&fields=` | `ctl`, `atl`, `rampRate`, `ctlLoad`, `atlLoad`, `sportInfo[]` | One record per day                        | **Yes**                              | **C**  |
| `GET /athlete/{id}/wellness/{date}`                       | Same                                                          | One day                                   | No: the list call also gives history | **C**  |
| `GET /athlete/{id}/athlete-summary{ext}?start=&end=`      | `fitness`, `fatigue`, `form`, `rampRate`                      | Per week, as of that week's last Activity | No: not a daily series               | **C**  |
| `GET /athlete/{id}/activities` and `GET /activity/{id}`   | `icu_ctl`, `icu_atl`                                          | Only on days with an Activity             | No: gaps on rest days                | **C**  |
| `GET /athlete/{id}/events`                                | `icu_ctl`, `icu_atl`                                          | Only on days with an event                | No: gaps                             | **C**  |

- The developer named the wellness record as the source for the chart: "Look for 'rampRate' on the wellness record for each day. This is what is displayed on the fitness chart." ([#275](https://forum.intervals.icu/t/api-access-to-intervals-icu/609?page=14)) and "The fitness stuff (CTL etc) is available via the API", with `GET /api/athlete/{id}/wellness?oldest=…&newest=…` as the example ([Calendar updates](https://forum.intervals.icu/t/calendar-and-fitness-updates/5551)). **C**
- The web app does the same. When it has wellness records, `createDayBuckets` takes `ctl`, `atl`, `ctlLoad` and `rampRate` from them. **C** (web code). `FitnessPage` passes wellness records into that chart component. I did not trace the final call, so that link is **I**.
- `athlete-summary`: "Calculates totals by week", and "Fitness, fatigue and form are as of the last activity completed in the week" ([#77](https://forum.intervals.icu/t/api-access-to-intervals-icu/609?page=4)). With a bearer token it returns only the token's athlete. **C** (spec)
- Field names to avoid: `Wellness.fatigue` is the subjective 0–4 score, **not** Fatigue. Use `atl`. **C**. See `docs/research/wellness-api.md`.
- `Settings.ctlFactor` and `atlFactor` are per-sport **load multipliers**, not time constants: the web code computes `load * ctlFactor`. **C**

### How the app calls the API today

- `lib/intervalsApi.ts`'s private `request()` already serialises any param and sends `Authorization: Bearer`. `IntervalsActivitiesParams.fields` shows the pattern for a projection.
- There is no wellness call yet. `lib/intervalsApiPaths.ts` has no wellness path, and the app omits `{ext}` on its paths. An empty extension is JSON. **C** (developer's example, see `wellness-api.md`)
- `getActivities` reads `icu_training_load` but not `icu_ctl` or `icu_atl`.

## 2. OAuth scope

**`WELLNESS:READ` is required.** The cookbook says: "Call the list wellness endpoint (WELLNESS:READ scope required)". **C**

The app requests `ACTIVITY:READ,CALENDAR:READ` (`hooks/useIntervalsAuth.ts:21`), so the scope is new. There is no scope-free path to a daily series:

| Scope alone     | What it reaches                    | Daily series? | Status                                                                                                                                                                 |
| --------------- | ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WELLNESS:READ` | `/wellness`                        | **Yes**       | **C**                                                                                                                                                                  |
| `ACTIVITY:READ` | `icu_ctl`, `icu_atl` on Activities | No            | **C** for the fields and for the [cookbook's scope](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090), **I** that they are readable under it |
| `CALENDAR:READ` | `icu_ctl`, `icu_atl` on events     | No            | **C** for the fields, **I** for the scope. "CALENDAR: Planned workouts" ([OAuth post](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759))                 |
| Unknown         | `athlete-summary`                  | No (weekly)   | **Unknown**: no source names its scope                                                                                                                                 |

Filling the gaps between Activities would mean calculating decay, which the map forbids. Strava-sourced Activities may also lack these fields: `lib/intervalsApi.ts` records that they come back without most of their body. **I**

Limits of this finding:

- The OpenAPI spec has no scope information at all (zero mentions of `scope`, `WELLNESS:READ` or similar in its paths). The cookbook is the only statement linking the endpoint to the scope. **C**
- The status for a token without the scope is **not established** for this endpoint. The developer said a missing `ACTIVITY:WRITE` gives a 403, and that he "will update the 403 message" ([#298](https://forum.intervals.icu/t/api-access-to-intervals-icu/609?page=15)). A 403 for `WELLNESS:READ` is therefore likely. **I** `request()` would raise `IntervalsApiError(403)`, not `IntervalsAuthError`, so it would not trip the global reconnect banner.
- The granted scope is already stored: `functions/src/intervals/exchangeToken.ts:60` saves `tokenResponse.scope` on the integration doc. **C** Athletes can deselect scopes in the consent dialog. **C** So a client can tell whether the scope was granted without a failing call. **I**
- Each authorisation issues a new token. "The most recent scopes apply to all access tokens." ([page 2](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759?page=2)) **C**

### Reading the Form display setting

`icu_form_as_percent` lives on the athlete record. The developer says athlete reads need `SETTINGS:READ` ([2025-08-24](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759?page=3)). **C** But the app already reads `/athlete/0` without that scope (`lib/intervalsQueries.ts:127`) to resolve power zones. These two facts conflict, and I could not resolve it without a live call. Either that read is allowed in practice or it is failing. **Unknown**. This matters only if the spec follows the athlete's percentage preference.

## 3. History and cost

| Fact              | Finding                                                                                                                                                                                            | Status                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Range limit       | None documented. The developer's example spans about 4 months                                                                                                                                      | **C** that none is documented                                                       |
| How far back      | No stated floor. In practice, as far as the athlete's data. Free users' Strava import is limited to a number of months                                                                             | **C** for the import limit (web code), **I** for the rest                           |
| No `oldest` given | Undocumented. A user saw "close to 2 months". Always send both bounds                                                                                                                              | **I**                                                                               |
| Result order      | Undocumented. Sort by `id` (the local date)                                                                                                                                                        | **Unknown**                                                                         |
| Projection        | `fields=id,ctl,atl,rampRate` works on the list call, and "also excludes null values"                                                                                                               | **C**                                                                               |
| Size              | About 45 bytes per record with that projection, so about 16 KB a year before compression                                                                                                           | **I** (my estimate)                                                                 |
| Request cost      | One request, whatever the range                                                                                                                                                                    | **I**                                                                               |
| Rate limit        | "100/user per day up to 500 users (max 50000 requests), with a minimum of 5000". 15-minute limit is 1/8 of daily, minimum 2500. 10 calls per second per IP. Over limit gives 429 and `Retry-After` | **C** ([first post](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)) |

A long range is cheap in requests. Its cost is payload only. A year of history is no burden, and an all-time read is untested.

## 4. Today and future dates

**Future dates are included, and they are projections.**

- Asked for "the prediction that shows in the /fitness page", the developer said: "You should be able to get future data with `newest=2023-01-08` etc." The asker replied: "that works just fine." ([thread](https://forum.intervals.icu/t/fitness-form-fatigue-load-over-api-calls/25042)) **C**
- The calculation uses planned load: "Training load targets are now included in future fitness calculations (CTL, ATL etc.)", with "The target load is spread evenly to each day of the week." ([Calendar updates](https://forum.intervals.icu/t/calendar-and-fitness-updates/5551)) **C**
- Future-dated planned Workouts feed in too: the web code adds their load and `icu_ctl`/`icu_atl` for any day from today on that has no completed Activity. **C** (web code, in the path used when no wellness records are loaded)
- "All the wellness stuff will be blank but you will get the fitness info" ([Calendar updates](https://forum.intervals.icu/t/calendar-and-fitness-updates/5551)) describes a calendar option, but it fits: future rows carry fitness only. **I**
- Values are one series: "The ATL and CTL values are calculated and stored for each day so it isn't simple to have another set." ([Fitness guide](https://forum.intervals.icu/t/fitness-page-a-guide-to-getting-started/17702), 2022-09-21) **C** So there is no actual vs predicted pair, and the only way to tell them apart is by comparing a record's date to today. **I**

**Projected values exist and are cheap.** They come from the same call under the same scope, with no separate endpoint. The map's out-of-scope note says a forecast returns as fog in exactly this case.

Caveats on the forecast:

- The direct evidence is from 2021–2022. I found nothing that retracts it. **I**
- How far ahead the rows go, and what a day past the last planned Workout returns, is **Unknown**. The web app's default view shows 7 days ahead. **C** (web code)
- Weekly load targets also move the projection, so it isn't purely "from planned Workouts". **C**

### Does today's value include today's load?

- **Completed load: yes.** Form is calculated from same-day Fitness and Fatigue: "it just seemed the right way to was to do it all on the day" ([Fitness guide](https://forum.intervals.icu/t/fitness-page-a-guide-to-getting-started/17702), 2023-02-14). To see pre-race numbers, "you need to look at the previous day" ([Factors post](https://forum.intervals.icu/t/change-fatigue-atl-and-fitness-ctl-factors/300), 2022-05-24). **C**
- **So numbers change during the day.** After a ride, today's Fatigue rises and Form falls. **I** An open query can go stale, and the card's value depends on when it was fetched.
- **A planned Workout not yet ridden: not established.** Evidence leans towards it being counted, because projections start from today in the web code above. **I** Showing the wellness record keeps Home equal to whatever Intervals.icu shows, so the card is faithful either way. The risk is only in how the card is described.

## 5. Form: stored or derived, and how it is presented

**Derived on the daily record.** `Wellness` has no Form field. **C** (spec) The web app computes it. **C** (web code)

```js
function form(e) { return e.ctl - e.atl }
function form_percent(e) { return e.ctl ? (e.ctl - e.atl) * 100 / e.ctl : null }
calcForm(atl, ctl, percent) {
  let n = Math.floor(ctl + .5) - Math.floor(atl + .5);
  return percent ? (ctl ? Math.floor(n * 100 / ctl + .5) : 0) : n;
}
```

Its displayed numbers subtract **rounded** values, so a card matching Intervals.icu should do the same. With that, the three shown numbers always add up. The chart line uses the unrounded version. Only `athlete-summary` returns a stored `form`, and that is weekly.

**Absolute or percentage.** Both exist, controlled by `icu_form_as_percent` on the athlete. **C** In the app's words:

> Form is your fitness minus fatigue. This can be displayed as an absolute number (e.g. -10) or as a percentage of your current fitness (e.g. -20%). The percentage option scales the zones (e.g. optimal training) to match your current fitness. However if your fitness is low (less than 60) it will exaggerate your form and might push you into the high risk zone. So only use the percentage if you do a lot of training.

The default is unclear: a [2021 user](https://forum.intervals.icu/t/understanding-form/3048) says percentage, while the current settings widget treats an unset value as false. **I**

**Zones.** These come straight from the web code (`highRisk: -30, optimal: -10, fresh: 5, transition: 20`). **C**

| Zone (Intervals.icu label) | Condition, Form or Form % | Colour in the Activity list |
| -------------------------- | ------------------------- | --------------------------- |
| Transition Zone            | ≥ 20                      | `#e4ae00`                   |
| Fresh Zone                 | 5 to < 20                 | `#34ace4`                   |
| Grey Zone                  | > -10 to < 5              | `#aaa`                      |
| Optimal Training Zone      | > -30 to ≤ -10            | `#33cc4c`                   |
| High Risk Zone             | ≤ -30                     | `#dd0000`                   |

- Check order is High Risk, Optimal, Transition, Fresh, otherwise Grey. A non-number is Grey. **C**
- **Percentage uses the same numbers**, so -30 becomes -30%. `formPercentFactor` is 100, which makes the scale 1. **C** The developer: "I used the absolute numbers e.g. -30 as a percentage" ([Form % post](https://forum.intervals.icu/t/form-as-a-percentage-of-fitness/869)).
- "The zones come from Joe Friel and are for absolute TSB", and they are "more of a 'rule of thumb' than science" ([Zones post](https://forum.intervals.icu/t/zones-of-form-in-fitness-chart/3623)). **C** Friel's Fresh band runs to +25 and gives no number for Transition, so +20 is Intervals.icu's own value. **C**
- These are not athlete settings. They are constants in the client, and athletes can't customise them. **C** for constants, **I** for no customisation.
- Colours: the chart uses theme variables (`--v-theme-form-high-risk` and so on). The hex values above are from `formColor`, used in the Activity list. The two may differ. **I**

## 6. Custom time constants

- Defaults are 42 days for Fitness and 7 for Fatigue. Each day: `value = previous * e^(-1/days) + load * (1 - e^(-1/days))`. **C** (web code)
- Athletes change them by adding a "Fitness Days" entry to the calendar: a `FITNESS_DAYS` event with `ctl_days` and `atl_days`. It applies "from that date", and "You can make this in the past to update all of your history" ([Factors post](https://forum.intervals.icu/t/change-fatigue-atl-and-fitness-ctl-factors/300), 2022-01-07). **C**
- `GET /athlete/{id}/fitness-model-events` lists `FITNESS_DAYS`, `SET_FITNESS` and `SET_EFTP` in date order. **C** (spec) Its scope is **Unknown**.
- Constants can change partway through the history, so a single number can't describe a range. **C**
- `ctl` and `atl` already reflect them, since they are stored daily and the server recalculates. **I** (the web app receives `FITNESS_UPDATED` messages that update stored records.) So the app needs no constants.
- A change can rewrite past values, so cached history can shift. **I**
- Form zones do not move with the constants. **C** But a longer Fatigue constant does change Form itself. **I**
- `SET_FITNESS` lets an athlete set a starting value, so Fitness need not start near zero. **C** (spec, for the event's existence)

## Consequences for the spec

1. **The scope decision stays with #236.** This map needs `WELLNESS:READ`, so the note in #242 about reusing that decision applies.
2. **Conflict with the map's wording.** "BH Cycling never calculates them" can't hold strictly for Form: the daily record has only `ctl` and `atl`. Subtracting them, rounded, is what Intervals.icu's own web app does. It introduces no model. The parent should reword this to "never models them", or decide otherwise.
3. **Forecast fog is triggered.** The map says a forecast returns only if projected values are cheap, and they are. Without a forecast, cap `newest` at today, so that projected rows can't enter the chart by accident.
4. **Don't write "42-day" in labels.** Constants are per-athlete and can change over time.
5. **Treat a missing day as a gap.** The web code handles missing records by decaying the previous day locally, which shows rows can be absent, and BH Cycling must not do that. **C** for the web code, **I** for rows being absent. Whether a chart draws a gap or joins the points is a design call.
6. **Share the wellness read if practical.** It's one endpoint, and the Wellness card reads the same records. `fields` differs, so reusing a query is a tradeoff to settle in the spec.
7. **Whether to follow `icu_form_as_percent`** is a product decision. Absolute Form needs no athlete read. Following the preference needs the read in section 2.

## Not established

Each of these needs one authenticated read on a real account. None can be settled from public sources.

| Question                                                                                  | Why it matters                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------- |
| Does today's record include a planned Workout not yet ridden?                             | How the card is described           |
| Does `/wellness` return 403 for a token without `WELLNESS:READ`?                          | Exact "Połącz ponownie" behaviour   |
| Are there rows for every day, including rest days and days before any data?               | Gap handling and new-athlete state  |
| How far ahead do future rows go, and do they still work as in 2022?                       | Whether a forecast is viable        |
| Which scope does `athlete-summary` need?                                                  | Low: it isn't recommended           |
| Does `/athlete/0` work with the current scopes, and does it return `icu_form_as_percent`? | Following the percentage preference |
| What are the result order and practical range limit?                                      | All-time views                      |
