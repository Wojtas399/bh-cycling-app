# Research: how intervals.icu exposes A/B/C Race events (#279)

Part of [Map: Races from Intervals.icu (#278)](https://github.com/Wojtas399/bh-cycling-app/issues/278).

**Sources.** The live OpenAPI spec (`https://intervals.icu/api/v1/docs`, fetched 2026-11-08), forum posts by david (David Tinker, the developer) on forum.intervals.icu, and the repo's own code at `8201df0`.

- **Stated**: a source says it directly.
- **Inferred**: my reading of the sources.
- **Unconfirmed**: no source settles it, so a live account has to check it (see the last section).

Previous live checks overrode some forum claims. In #146, a 2020 forum post said `oldest`/`newest` widen to multi-day events, and the live API didn't. Treat old forum posts as weaker than the live API.

---

## 1. Fields on a `RACE_A` / `RACE_B` / `RACE_C` event

**One schema covers every category.** `GET /api/v1/athlete/{id}/events{format}` (`listEvents`) returns `array<Event>` (stated, spec). `Event.category` is an enum: `WORKOUT, RACE_A, RACE_B, RACE_C, NOTE, PLAN, HOLIDAY, SICK, INJURED, SET_EFTP, FITNESS_DAYS, SEASON_START, TARGET, SET_FITNESS` (stated, spec). The spec has no race-specific schema and no `required` fields, so any field may be missing on a Race (stated: schema; inferred: Races aren't special-cased).

The fields the ticket asks about, as the `Event` schema types them (stated, spec). Whether each one is filled on a Race is **unconfirmed**.

| Field                                           | Spec type                                    | Notes for Races                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                            | int32                                        | Same id space as Workouts. `paired_event_id` refers to it (see §2).                                                                                                                                                                                                                                             |
| `category`                                      | enum string                                  | `RACE_A`, `RACE_B` or `RACE_C`. The priority is in the category; no separate priority field exists. david: "A, B and C races just indicate which ones are more important than others" ([forum 139 #10](https://forum.intervals.icu/t/better-support-for-multi-day-calendar-entries/139)).                       |
| `name`                                          | string                                       | Expected to be the race name. Could be missing, `null` or `""`, as on Notes (inferred from #141/#146).                                                                                                                                                                                                          |
| `type`                                          | string                                       | The sport (`Ride`, `Run`, …), the same field Workouts use. Every sport's Races should show (#278), so the app must not filter on `Ride`.                                                                                                                                                                        |
| `description`                                   | string                                       | Free text.                                                                                                                                                                                                                                                                                                      |
| `start_date_local`                              | string                                       | `YYYY-MM-DDTHH:MM:SS`, local time with no timezone. A race with a start time likely carries it here (inferred from how Workouts carry a time of day, [forum 7141](https://forum.intervals.icu/t/time-on-workouts-on-the-calendar/7141)).                                                                        |
| `end_date_local`                                | string                                       | See "Multi-day races" below.                                                                                                                                                                                                                                                                                    |
| `moving_time`                                   | int32                                        | The race's estimated duration, seconds (inferred: david says you add each day as a Race "if you want estimated time or training load", [forum 139 #8](https://forum.intervals.icu/t/better-support-for-multi-day-calendar-entries/139)).                                                                        |
| `icu_training_load`                             | int32                                        | The estimated load (inferred, same quote).                                                                                                                                                                                                                                                                      |
| `distance`                                      | float                                        | Metres (inferred from Workouts).                                                                                                                                                                                                                                                                                |
| `load_target`, `time_target`, `distance_target` | int32 / int32 / float                        | They are in the schema, but probably belong to `TARGET` events, not Races (inferred: nothing links them to Races). **Don't rely on them for Races.**                                                                                                                                                            |
| `workout_doc`                                   | object                                       | A free-form map in the spec. Whether a Race ever has steps is **unconfirmed**. The app should treat a Race as having no Workout Profile and degrade gracefully if one shows up.                                                                                                                                 |
| `color`                                         | string                                       | Hex string or `null` on Notes (confirmed live in #146). Probably the same for Races (inferred).                                                                                                                                                                                                                 |
| `indoor`                                        | boolean                                      | Probably the race's indoor/outdoor flag, e.g. Zwift races (inferred).                                                                                                                                                                                                                                           |
| `sub_type`                                      | enum `NONE, COMMUTE, WARMUP, COOLDOWN, RACE` | `RACE` here is a sub-type, not a category. Most likely meant for `WORKOUT` events. Don't use it to find Races; use `category` (inferred).                                                                                                                                                                       |
| `shared_event_id`                               | int32                                        | Races can come from intervals.icu's shared race search ("search for races shared by others", [forum 52320 #1](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320)). The spec has `GET /api/v1/shared-event/{id}`, "Get a shared event (e.g. race)" (stated). Not needed for read-only display. |
| `paired_activity_id`                            | **not in the spec**                          | Returned by the events list for Workouts (verified in #184, typed in `lib/intervalsApi.ts`). Whether a Race carries it too is **unconfirmed** but likely (see §2).                                                                                                                                              |

### Multi-day races (stage races)

- david, 2020: "Workouts and races can only be one day long." For a multi-day race, "You will still need to add each day as a separate 'Race'" ([forum 139 #5, #8](https://forum.intervals.icu/t/better-support-for-multi-day-calendar-entries/139), stated). Multi-day entries are for `NOTE` / `HOLIDAY` etc.
- No newer developer post says this changed. A January 2025 feature request still asks to "add multiple race days" and has no developer reply ([forum 88091](https://forum.intervals.icu/t/add-multiple-race-days-calendar-entry/88091)).
- **So a stage race arrives as one `RACE_*` event per stage day** (inferred from stated sources). The app can treat a Race as single-day, the way it treats a Workout. If `end_date_local` comes back as start + 1 day (exclusive, the same as a one-day Note in #146), that is still a single day. The exact value on a Race is **unconfirmed**.
- Also, `GET /events` filters by start date only (confirmed live in #146), so a Race is always found by the day it's on.

## 2. Can an Activity pair to a Race?

**Yes.**

- david, 2023: "If the activity is paired with a race (automatically or manually) it will be set as a race. If you unpair it later then the race flag is cleared." ([forum 45622 #6](https://forum.intervals.icu/t/race-tag-with-planned-races/45622), stated.) Pairing works the same way as for Workouts: automatically, or by drag and drop.
- david, 2023: "The activities get the A/B/C indicator if they have been paired with a planned race." ([forum 52320 #19](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320), stated.)
- `paired_event_id` "refers to an event (workout or note etc. on your calendar)" ([forum 40322 #2](https://forum.intervals.icu/t/paired-event-id/40322), stated). The spec types `Activity.paired_event_id` as int32, with no category restriction.
- **How it's stored:** the same two fields as a Workout pairing. The Activity's `paired_event_id` holds the Race event's `id`, and the event's `paired_activity_id` holds the Activity id (inferred: one mechanism serves every event category, and ADR 0009 found both sides on Workouts). The event side on a Race is **unconfirmed**, and it matters. A Strava Activity's `paired_event_id` is always null (ADR 0009), so a Race paired to a Strava ride is visible only on the event side.
- **Side effect:** pairing sets `Activity.race = true` (spec field `race: boolean`; the behaviour is from the david quote above). Don't use the flag as a pairing signal. It can also come from Strava's own race flag with no Race event at all, and a Strava Activity's body leaves it blank (inferred from forum 45622 and ADR 0009).

### Does the existing pairing code pick it up unchanged?

**No, but the rule itself carries over with no change.**

- `pairWorkouts` / `pairWorkout` in `lib/pairing.ts` don't care about category. `PairableEvent` is only `id | paired_activity_id`, and the rule is ADR 0009's either-side rule on primary keys. A Race event can go into them as it is.
- Races are dropped before pairing. `joinCalendarItems` (`lib/calendarItems.ts:89`) calls `toSortedDatedWorkoutEvents`, which keeps only `category === 'WORKOUT'` (`lib/localDate.ts:43`), and then passes only those events to `pairWorkouts`. So today:
  - An Activity whose `paired_event_id` names a Race is **not** in `pairedActivityIds`, so it shows as an **Unplanned Activity**. The doc comment on `joinCalendarItems` says this on purpose ("including one paired to an event not among `events` (a race, …)").
  - That Race id still lands in `completedEventIds`, because the loop over Activities adds every `paired_event_id`. Nothing uses it for a Race yet.
  - A Race's own `paired_activity_id` is never read.
- **What an implementation needs** (inferred): pass the Race events into the pairing step next to Workouts (or call `pairWorkouts` a second time with them), so that paired Activities leave the Unplanned list and the Race gets "paired / completed" from either side. The ADR 0009 rule needs no change. The function names and `WorkoutPairing` wording would need widening. The single-event read (`getCalendarEvent`) lacks `paired_activity_id` (#191), so any Race details screen would have the same gap Workout Details has.

## 3. `GET /events` category filter and look-ahead

**Category filter** (stated, spec): `category` is an `array<string>` query param, "Comma separated list of categories to filter for (e.g. WORKOUT,NOTES)". The spec's example has a typo: the enum value is `NOTE`. So **one call, `category=RACE_A,RACE_B,RACE_C`, should return all three priorities** (stated: spec). That a multi-value filter works live is **unconfirmed**: the app has only ever sent one category (`WORKOUT` or `NOTE`). `deleteEvents` describes its `category` param the same way: "Comma separated list of event categories to delete". In code, `IntervalsCalendarEventsParams.category` is typed as a single `EventCategory`, and `request()` sets `String(value)`. It needs a `RACE_*` value or a comma-joined string.

**No filter needed for the month/day views** (stated: #278 Notes, matching the code). `fetchCalendarRange` already makes an unfiltered `/events` call (`lib/intervalsQueries.ts:481`), so Races are already in `events` for every Calendar range and Home's "Dziś i jutro". A separate `category=` call is only needed where the app looks further ahead than it already fetches, i.e. the next-race card.

**Look-ahead** (stated, spec):

- `oldest`: "default is today in the athletes timezone".
- `newest`: "(inclusive), default is oldest plus 6 days".
- `limit`: "Max number of events to return (default is all events)".
- The spec states **no maximum range**, and no developer post gives one (unconfirmed). intervals.icu's own Races dropdown shows "races for the next 366 days" ([forum 52320 #1](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320), stated). That's a natural window for a next-race card: `oldest=today`, `newest=today+365`, `category=RACE_A,RACE_B,RACE_C` (inferred). With the filter, the response stays small. A Race has no `workout_doc` steps, so `resolve` isn't needed. `fields=` can cut it down further (spec: "Comma separated list of field names … also excludes null values").
- `limit=1` isn't a safe "next race" query. The ordering of the list isn't documented, and #141 found same-day order is roughly by `id`. Several Races can share a day. Fetch the window and sort by `start_date_local`, then `id` (inferred).

## 4. Scope: does `CALENDAR:READ` cover Races?

**Yes, and no re-authorization is needed** (inferred, strongly).

- intervals.icu's OAuth scopes are per area, not per category: "ACTIVITY: Completed rides, runs etc. / WELLNESS / CALENDAR: Planned workouts / CHATS / LIBRARY / SETTINGS" ([forum 2759 #1](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759), stated, 2021). Races are events on the same `/events` endpoint, and no finer scope exists.
- The app already requests `CALENDAR:READ` (`hooks/intervalsScopes.ts`). Its unfiltered `/events` call already gets Races back with today's tokens: #278 says they "already arrive in the existing `/events` fetches and are dropped at `lib/localDate.ts`" (stated by the repo owner while charting).
- The spec doesn't document per-endpoint scopes (stated, by absence).

## 5. What else intervals.icu does with Races

What a reader might expect to see, from intervals.icu's own UI:

- **Days until the race**: shown under the race name on the calendar. david added it in 2021 ("I added it under the name. Ack! My A race is only 21 days away!", [forum 4842 #2](https://forum.intervals.icu/t/counting-days-before-a-b-c-race/4842), stated). The exact wording/format isn't readable from the thread (unconfirmed).
- **Races dropdown** on the calendar page: races for the next 366 days. Clicking one navigates to it, and the A/B/C icon opens it in place. A "Past" checkbox shows the last year of races "with the number of days ago they took place" ([forum 52320 #1, #15](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320), stated).
- **The A/B/C indicator** is the priority badge. Activities paired with a planned race get it too ([forum 52320 #19](https://forum.intervals.icu/t/quick-view-of-races-on-calendar/52320), stated). This supports showing a paired Race + Activity as one item with the badge.
- **Race flag on Activities**: a paired Activity becomes a race, which shows as a red dot on the fitness chart and can be filtered in the Activities table ([forum 45622 #4, #6](https://forum.intervals.icu/t/race-tag-with-planned-races/45622), stated). Out of scope for #278 (the Fitness chart is excluded).
- **Estimated time and load** on a planned Race feed the fitness projection ([forum 139 #8](https://forum.intervals.icu/t/better-support-for-multi-day-calendar-entries/139), inferred). Possibly worth showing as planned duration, like a Workout's.
- **Shared races / race search**: other athletes' public races can be searched and added (`shared_event_id`, `GET /shared-event/{id}`). Read-only display can ignore this.

## Needs a live account

1. A real `RACE_A`/`B`/`C` body: which of `name`, `type`, `description`, `moving_time`, `icu_training_load`, `distance`, `color`, `indoor`, `workout_doc` are set, and what `end_date_local` is (expected start + 1 day).
2. Whether a Race paired to an Activity carries `paired_activity_id` in the events list, especially when the Activity is from Strava. This is the deciding fact for ADR 0009 on Races.
3. Whether the paired Activity's `paired_event_id` holds the Race id (native Activity).
4. Whether `category=RACE_A,RACE_B,RACE_C` returns all three priorities in one call.
5. Whether a one-year window (`newest = oldest + 365`) works with no cap or error.
6. Whether a stage race shows as one `RACE_*` per day, or whether an athlete can now give a Race a multi-day span.
7. (Low priority) The wording of intervals.icu's "days until" label, as a reference for the Polish countdown copy.
