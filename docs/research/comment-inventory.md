# Inventory: explanatory comments and the workarounds behind them

Task #405 for map #403 (Ban explanatory comments). Measured on `origin/main` @ `4498b2d`, 2026-11-19, with the TS-scanner extractor from #404 (leading + trailing ranges).

## Totals

- **1,773 comment ranges in 308 files.** Consecutive `//` lines are merged into one block, giving **1,646 blocks**: **1,264 JSDoc** and **382 other** (509 ranges). The map's 2026-11-17 baseline (454 explanatory, 7 refs, 3 `eslint-disable`, 1 TODO, 1 URL) counted differently; this recount merges multi-line `//` runs into one block and includes code landed since.
- Every one of the 382 is classified below. The classes mean what the ticket says: **name** (a rename, extract or named constant removes it), **domain** (the term belongs in `CONTEXT.md`), **workaround** (the code works around a library, platform or our own design), **test** (it belongs in a test name or `it` title) and **delete** (it adds nothing).

## Counts per directory and kind (non-JSDoc blocks)

| dir          |    name | domain | workaround |   test | delete |   total |
| ------------ | ------: | -----: | ---------: | -----: | -----: | ------: |
| `lib`        |      52 |      4 |         29 |     66 |      3 |     154 |
| `hooks`      |       7 |      3 |         22 |     17 |      1 |      50 |
| `components` |      16 |      0 |         15 |      0 |      2 |      33 |
| `app`        |      28 |      2 |         35 |      3 |      8 |      76 |
| `e2e`        |      10 |      2 |         22 |      6 |      0 |      40 |
| `constants`  |       9 |      2 |          0 |      0 |      6 |      17 |
| `scripts`    |       3 |      0 |          3 |      0 |      0 |       6 |
| `functions`  |       0 |      0 |          2 |      0 |      0 |       2 |
| `i18n`       |       0 |      0 |          1 |      0 |      1 |       2 |
| `__mocks__`  |       0 |      0 |          1 |      0 |      0 |       1 |
| `test-utils` |       0 |      0 |          1 |      0 |      0 |       1 |
| **all**      | **125** | **13** |    **131** | **92** | **21** | **382** |

JSDoc blocks per directory: lib 739, components 261, hooks 109, i18n 62, app 54, e2e 33, test-utils 3, constants 2, functions 1.

## Recurring workaround patterns

The 131 workaround blocks fall into 12 families. Counts are blocks; ids point into the full table.

### A. Form submit through mutateAsync (18)

Every form hook calls `await x.mutateAsync(values).catch(() => {})` and comments that "a failure surfaces through `x.error`"; sibling comments explain that starting one mutation resets the other, that every server error is a form error (`serverError: () => ''`), and that valibot keeps the first issue per field. One shared submit helper (or `mutate` + `onSettled`) removes the 11 swallow comments; a named `formErrorsOnly` mapper removes the `serverError` ones.

- `rq-swallow-mutateAsync` (11): `app/(app)/change-password/useChangePassword.ts:110`, `app/(app)/delete-account/useDeleteAccount.ts:149`, `app/(auth)/forgot-password/useForgotPassword.ts:59`, `app/(auth)/forgot-password/useForgotPassword.ts:67`, `app/(auth)/sign-in/useSignIn.ts:75`, `app/(auth)/sign-in/useSignIn.ts:85`, `app/(auth)/sign-up/useSignUp.ts:76`, `app/(auth)/sign-up/useSignUp.ts:86`, `app/(auth)/verify-email/useVerifyEmail.ts:72`, `app/(auth)/verify-email/useVerifyEmail.ts:81`, `hooks/useIntervalsAuth.ts:94`
- `rq-one-mutation-error` (4): `app/(app)/change-password/useChangePassword.ts:76`, `app/(auth)/sign-in/useSignIn.ts:50`, `app/(auth)/sign-up/useSignUp.ts:49`, `app/(auth)/verify-email/useVerifyEmail.ts:93`
- `rq-error-channel` (1): `app/(auth)/verify-email/useVerifyEmail.ts:47`
- `valibot-issue-order` (2): `app/(app)/change-password/changePasswordSchema.ts:21`, `app/(auth)/sign-up/signUpSchema.ts:17`

### B. Jest timing and module resets (15)

Ten copies of "React Query hands the settled state to the hook on a later tick" sit over the same `act(() => new Promise(r => setTimeout(r, 0)))`. One `settleQueries()` in `test-utils/` absorbs them; `jest.isolateModules` and focus resets become named helpers.

- `rq-settle-tick` (10): `app/(app)/change-password/__tests__/useChangePassword.test.ts:93`, `app/(app)/delete-account/__tests__/useDeleteAccount.test.ts:133`, `app/(auth)/forgot-password/__tests__/useForgotPassword.test.ts:32`, `app/(auth)/forgot-password/__tests__/useForgotPassword.test.ts:197`, `app/(auth)/sign-in/__tests__/useSignIn.test.ts:56`, `app/(auth)/sign-up/__tests__/useSignUp.test.ts:56`, `app/(auth)/verify-email/__tests__/useVerifyEmail.test.ts:46`, `hooks/__tests__/useFormTextField.test.ts:51`, `hooks/fitness/__tests__/useFitnessChart.test.ts:78`, `hooks/home/__tests__/useTodayCards.test.ts:112`
- `jest-flush-promises` (1): `lib/__tests__/splashScreen.test.ts:41`
- `jest-module-reset` (2): `lib/__tests__/splashScreen.test.ts:16`, `lib/toast/__tests__/toast.test.ts:44`
- `jest-global-reset` (1): `hooks/calendar/__tests__/useCalendarRange.test.ts:145`
- `jest-native-mock` (1): `__mocks__/@expo/ui.tsx:1`

### C. Referential stability for React Query (8)

`useMemo` around `select`/`combine` "so it is stable per day/range", and `refetch` routed through the client "so the tracked result isn't widened". Two shapes, repeated in calendar, workout, activity and route hooks: candidates for `useStableSelect` / `useRefetchQuery` helpers whose names carry the reason.

- `memo-for-identity` (4): `app/(app)/fitness.tsx:155`, `hooks/calendar/useCalendarRange.ts:77`, `hooks/calendar/useCalendarRange.ts:83`, `hooks/workout/useWorkoutDetails.ts:23`
- `rq-render-tracking` (4): `hooks/activity/useActivityDetails.ts:20`, `hooks/activity/useActivityDetails.ts:28`, `hooks/useActivityRoute.ts:21`, `hooks/workout/useWorkoutDetails.ts:32`

### D. Swallowed errors (`.catch(() => {})`, empty catch) (6)

Best-effort calls (splash hide, Google sign-out, Firestore delete, verification send) with a comment saying why the error is dropped. A named `ignoreFailure(promise)` or `bestEffort()` carries it.

- `swallowed-error` (6): `app/(auth)/verify-email/useVerifyEmail.ts:89`, `lib/handleIntervalsAuthError.ts:20`, `lib/queryClient.ts:10`, `lib/signOutAndClear.ts:16`, `lib/splashScreen.ts:13`, `lib/verificationEmail.ts:33`

### E. e2e locators vs the accessibility tree (22)

Half the e2e comments explain that iOS merges an accessible button's children into one label, so tests match the composed label; others explain swiping a card clear of the tab bar, a stacked screen still in the tree, iOS system sheets, and keyboard Done. Named locator helpers (`byComposedLabel`, `tapClearOfTabBar`, `dismissSavePasswordSheet`) carry these.

- `e2e-a11y-merged-label` (11): `e2e/tests/activity-details-profile.e2e.ts:22`, `e2e/tests/activity-details-profile.e2e.ts:45`, `e2e/tests/calendar-week.e2e.ts:19`, `e2e/tests/calendar-week.e2e.ts:22`, `e2e/tests/calendar-week.e2e.ts:29`, `e2e/tests/calendar.e2e.ts:21`, `e2e/tests/calendar.e2e.ts:31`, `e2e/tests/note-details.e2e.ts:13`, `e2e/tests/note-details.e2e.ts:42`, `e2e/tests/races-calendar.e2e.ts:26`, `e2e/tests/races-home.e2e.ts:25`
- `e2e-stacked-screen-tree` (2): `e2e/tests/note-details.e2e.ts:23`, `e2e/tests/workout-details.e2e.ts:21`
- `e2e-scroll-clear-tabbar` (2): `e2e/tests/note-details.e2e.ts:18`, `e2e/tests/races-home.e2e.ts:43`
- `e2e-system-ui` (2): `e2e/support/signIn.ts:27`, `e2e/tests/sign-out.e2e.ts:21`
- `e2e-ios-keyboard` (1): `e2e/support/signIn.ts:22`
- `e2e-timezone` (1): `e2e/support/seedPlan.ts:97`
- `e2e-month-edge` (1): `e2e/tests/races-calendar.e2e.ts:19`
- `e2e-env-ordering` (1): `e2e/seed.ts:22`
- `e2e-device-tooling` (1): `e2e/support/targetPlan.ts:51`

### F. intervals.icu API quirks (8)

Strava Activities lacking fields, `paired_activity_id` missing on the single read (#191), `""` ids, comma-joined params, repeat steps carrying totals, compliance sentinels. These belong in the API adapter as named normalisers, with the facts in `CONTEXT.md`.

- `intervals-api-quirk` (8): `hooks/workout/__tests__/useWorkoutDetails.test.ts:235`, `lib/__tests__/calendarItems.test.ts:95`, `lib/__tests__/workoutProfile.test.ts:420`, `lib/intervalsApi.ts:297`, `lib/pairing.ts:84`, `lib/races.ts:58`, `lib/workoutDetails.ts:265`, `lib/workoutDetails.ts:297`

### G. Platform and native-UI differences (19)

iOS vs Android branches (glass, sheet toast host), screen-reader focus order set by tree order, negative margins that bleed a hit area, sonner overrides, MapLibre attribution, Reanimated UI→JS crossing. Mostly extract-and-name (`ANDROID_SHEET_TOAST_HOST`, `RouteMapFocusOrder`), a few need an ADR line.

- `platform-branch` (4): `app/(app)/(tabs)/_layout.tsx:29`, `app/(app)/_layout.tsx:13`, `components/BottomSheet.tsx:75`, `components/BottomSheet.tsx:124`
- `a11y-tree-order` (3): `components/route/RouteMapScreen.tsx:113`, `components/route/RouteMapScreen.tsx:196`, `components/route/RouteMapScreen.tsx:248`
- `a11y-grouping` (2): `components/calendar/CalendarWeekAgenda.tsx:140`, `components/workout/TimeInZoneRows.tsx:125`
- `negative-margin-bleed` (2): `components/calendar/CalendarWeekAgenda.tsx:202`, `components/calendar/CalendarWeekAgenda.tsx:251`
- `sheet-dismiss-signal` (1): `components/BottomSheet.tsx:60`
- `maplibre-attribution` (1): `components/RouteMap.tsx:79`
- `reanimated-ui-js-bridge` (1): `components/workout/ProfileWithTimeAxis.tsx:104`
- `dark-only-config` (1): `app/_layout.tsx:25`
- `sonner-config` (3): `lib/toast/ToastHost.tsx:35`, `lib/toast/ToastHost.tsx:54`, `lib/toast/ToastHost.tsx:104`
- `nav-prevent-remove` (1): `app/(app)/delete-account/useDeleteAccount.ts:114`

### H. Auth, session and cache ordering (14)

Re-auth before account delete, verify-email cooldown racing the auth gate, `onUserChanged` vs `onAuthStateChanged`, reconnect wiping Intervals queries first, Wellness-scope gating. Order-sensitive steps that want named functions per step.

- `firebase-reauth` (4): `app/(app)/delete-account/useDeleteAccount.ts:90`, `app/(app)/delete-account/useDeleteAccount.ts:107`, `functions/src/account/deleteAccount.ts:16`, `functions/src/account/deleteAccount.ts:38`
- `auth-flow-ordering` (2): `app/(auth)/verify-email/useVerifyEmail.ts:19`, `app/(auth)/verify-email/useVerifyEmail.ts:34`
- `firebase-auth-listener` (1): `lib/authState.ts:10`
- `intervals-reconnect-cache` (4): `hooks/useIntervalsAuth.ts:65`, `hooks/useIntervalsAuth.ts:67`, `hooks/useIntervalsAuth.ts:85`, `lib/handleIntervalsAuthError.ts:15`
- `scope-gate` (2): `hooks/fitness/useFitnessChart.ts:38`, `hooks/home/useTodayCards.ts:48`
- `sheet-close-on-reload` (1): `hooks/calendar/useDaySheet.ts:44`

### I. Forcing the type system or a lint rule (7)

Casts or schema shapes chosen to satisfy a type, plus 3 `eslint-disable` lines whose reason sits on a separate comment line (2) instead of after `--`.

- `type-shape-forcing` (4): `app/(app)/delete-account/deleteAccountSchema.ts:15`, `lib/profilePlot.ts:83`, `lib/profileReadout.ts:138`, `lib/validation.ts:47`
- `eslint-disable-reason` (3): `components/WorkoutProfile.tsx:79`, `i18n/index.ts:10`, `test-utils/form.ts:18`

### J. Module-level stores, clocks and sentinels (8)

`externalStore`, `secondClock`, `authState` and `-1` sentinels for "nothing touched". Name the sentinel (`NO_COLUMN`) or use `null`.

- `module-store` (4): `hooks/useSurfaceContrast.ts:10`, `lib/__tests__/secondClock.test.ts:3`, `lib/authState.ts:22`, `lib/externalStore.ts:12`
- `clock-subscription` (2): `hooks/useCooldown.ts:25`, `hooks/useCooldown.ts:45`
- `sentinel-value` (2): `components/fitness/FitnessChart.tsx:112`, `components/workout/ProfileWithTimeAxis.tsx:129`

### K. Number and date edge cases (3)

DST rounding, float rounding to a millionth, `getDay()` counting from Sunday. Each is one named helper (`wholeDaysBetween`, `roundToMillionth`, `mondayBasedWeekday`).

- `dst-rounding` (1): `lib/calendarGrid.ts:51`
- `float-rounding` (1): `lib/detailedProfile.ts:97`
- `date-getday-sunday` (1): `lib/noteDates.ts:32`

### L. Build-script tool quirks (3)

`scripts/generate-icons.js`: Jimp PNG header, byte-exact SVG text, themed-icon masks. Local to one script.

- `svg-byte-exact` (1): `scripts/generate-icons.js:18`
- `platform-icon-rules` (1): `scripts/generate-icons.js:81`
- `jimp-png-header` (1): `scripts/generate-icons.js:216`

## Issue, ADR and URL references

- **Non-JSDoc (7):** `components/BottomSheet.tsx` ×2 (ADR 0003, ADR 0004), `i18n/locales/pl.ts:12` (ADR 0006), and #280 ×2, #191, #184 in test fixtures.
- **JSDoc (19):** ADR 0005 ×4 (screen headers), ADR 0010 ×3, ADR 0009 ×4, ADR 0007 ×2, ADR 0003, 0004, 0006 once each, #191, #280, and one URL (`lib/stripNoteHtml.ts:3`).
- All ADR refs point at a decision the code obeys; the ADR itself is the record, so these go. The issue refs pin fixture shapes to a live body; the fixture name can say `liveRaceBody` instead.

## Special cases

- **TODO (1):** `constants/legal.ts:1` (real privacy-policy and terms URLs before store submission). Classified **delete**, but it is a live task: file it as an issue before deleting the comment.
- **eslint-disable (3):** `test-utils/form.ts:18` already has `-- fixed list` and survives as is. `components/WorkoutProfile.tsx:83` and `i18n/index.ts:10` carry their reason on the line above; it moves after `--`.
- **`@ts-expect-error`:** none in the repo.
- **Inline comments (42):** 19 JSX `{/* */}` and 23 trailing `//`, mostly in `lib/__tests__/weekNotes.test.ts` (date ranges of fixture Notes: a named fixture per Note removes them) and `constants/theme.ts`.
- **`constants/theme.ts` (15):** section headers ("Semantic — text", "Body — small (14px)"). Splitting the palette into named groups (`textColors`, `borderColors`) or deleting removes them.

## JSDoc spot-check: units and constraints

A random sample of 60 of the 1,264 JSDoc blocks (seed 7):

- **4 / 60 (≈7%) state a unit or format** a name or type must absorb: `start_time` "elapsed seconds", `date` "`YYYY-MM-DD`", `joules` "in joules", `fromYearMonth` "local midnight". Extrapolated: **≈85 blocks**. A regex over all 1,264 finds 73 with unit words (`in s`, `px`, `pt`, `ms`, `%FTP`...), which agrees.
- **12 / 60 (≈20%) state a constraint or nullability rule**: "never `0`", "`null` when it has none", "only on a single read with `intervals: true`", "absent on a Strava Activity", "skipped without credentials", "always holds a password". Extrapolated: **≈250 blocks**. A regex for never/always/only/must/null-when finds 106, a floor.
- **5 / 60 (≈8%) give an output example** ("`88–93% · 220–233 W`", "5 – 11 października 2026"). These belong in a test of the formatter, which mostly exists already.
- Together **≈27% of JSDoc (≈340 blocks)** carry something a name, a branded or literal type (`Seconds`, `LocalDateString`), a `| null` in the type, or a test would have to absorb. The other ≈73% restate the name or the type and can go with no replacement.
- The 62 JSDoc blocks in `i18n/locales/pl.ts` describe where each string shows. Keys are already nested by screen; deleting them is safe.

## Full table

|   # | location                                                              | kind       | pattern                   | comment (first line)                                                                                |
| --: | --------------------------------------------------------------------- | ---------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
|   0 | `__mocks__/@expo/ui.tsx:1`                                            | workaround | jest-native-mock          | Jest can't drive the native sheet; render its content only while presented.                         |
|   1 | `app/(app)/(tabs)/_layout.tsx:29`                                     | workaround | platform-branch           | Painting the iOS bar would cover its glass.                                                         |
|   2 | `app/(app)/(tabs)/home/index.tsx:62`                                  | name       |                           | Home has no error state: a failed fetch with nothing to show leaves it                              |
|   3 | `app/(app)/(tabs)/settings/__tests__/index.test.tsx:192`              | test       |                           | Pressable SettingsRows expose accessibilityRole="button".                                           |
|   4 | `app/(app)/_layout.tsx:11`                                            | name       |                           | First, so the auth gate lands a verified user on the tabs.                                          |
|   5 | `app/(app)/_layout.tsx:13`                                            | workaround | platform-branch           | Slide up over Workout Details and Activity Details. On Android,                                     |
|   6 | `app/(app)/activity/[id].tsx:48`                                      | name       |                           | The same Route query the banner reads, so a refresh can retry it. It's                              |
|   7 | `app/(app)/activity/[id].tsx:51`                                      | name       |                           | Skipped when the Activity isn't paired.                                                             |
|   8 | `app/(app)/activity/[id].tsx:63`                                      | name       |                           | A loaded Route is never fetched again; a failed one is retried.                                     |
|   9 | `app/(app)/activity/[id].tsx:159`                                     | domain     |                           | `route` is `null` for a trainer ride, a VirtualRide or no GPS.                                      |
|  10 | `app/(app)/activity/[id].tsx:176`                                     | name       |                           | Held until the ride can be drawn as it'll stay: in watts or %FTP.                                   |
|  11 | `app/(app)/change-password/__tests__/changePasswordSchema.test.ts:74` | delete     |                           | Matches the hand-written validation this schema replaced.                                           |
|  12 | `app/(app)/change-password/__tests__/useChangePassword.test.ts:93`    | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  13 | `app/(app)/change-password/__tests__/useChangePassword.test.ts:123`   | delete     |                           | Per-field rules live in changePasswordSchema.test.ts; these cover timing.                           |
|  14 | `app/(app)/change-password/changePasswordSchema.ts:21`                | workaround | valibot-issue-order       | Cross-field issues come after each field's own, and the resolver keeps                              |
|  15 | `app/(app)/change-password/useChangePassword.ts:38`                   | name       |                           | Maps to the generic form error.                                                                     |
|  16 | `app/(app)/change-password/useChangePassword.ts:76`                   | workaround | rq-one-mutation-error     | Starting one mutation resets the other, so at most one has an error.                                |
|  17 | `app/(app)/change-password/useChangePassword.ts:96`                   | name       |                           | Editing the new password re-checks "passwords mismatch"; editing the                                |
|  18 | `app/(app)/change-password/useChangePassword.ts:110`                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `changePassword.error`.                                                  |
|  19 | `app/(app)/delete-account/__tests__/useDeleteAccount.test.ts:107`     | test       |                           | Google-only accounts render no field.                                                               |
|  20 | `app/(app)/delete-account/__tests__/useDeleteAccount.test.ts:133`     | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  21 | `app/(app)/delete-account/deleteAccountSchema.ts:6`                   | name       |                           | Never trimmed: a password is checked exactly as typed.                                              |
|  22 | `app/(app)/delete-account/deleteAccountSchema.ts:15`                  | workaround | type-shape-forcing        | Not `v.object({})`: one `FormBinding<DeleteAccountInput>` needs both schemas to share a value type. |
|  23 | `app/(app)/delete-account/index.tsx:90`                               | name       |                           | Red on the icon only: a red label fails AA on Frost.                                                |
|  24 | `app/(app)/delete-account/useDeleteAccount.ts:90`                     | workaround | firebase-reauth           | Forces a token carrying the new `auth_time`, which the function checks.                             |
|  25 | `app/(app)/delete-account/useDeleteAccount.ts:100`                    | delete     |                           | The root toast host outlives the sign-out redirect to sign-in.                                      |
|  26 | `app/(app)/delete-account/useDeleteAccount.ts:107`                    | workaround | firebase-reauth           | Sign out so the account picker shows again on the next attempt.                                     |
|  27 | `app/(app)/delete-account/useDeleteAccount.ts:114`                    | workaround | nav-prevent-remove        | Going back is blocked while the request runs: the hardware back button                              |
|  28 | `app/(app)/delete-account/useDeleteAccount.ts:149`                    | workaround | rq-swallow-mutateAsync    | A failure surfaces through `deleteAccount.error`.                                                   |
|  29 | `app/(app)/fitness.tsx:94`                                            | name       |                           | Stacked over the tabs, so the tabs' banner for a 401 is hidden.                                     |
|  30 | `app/(app)/fitness.tsx:155`                                           | workaround | memo-for-identity         | Its own memo, so a new touched day doesn't hand the chart a new slice and                           |
|  31 | `app/(app)/fitness.tsx:158`                                           | name       |                           | The year ends today.                                                                                |
|  32 | `app/(app)/workout/[id].tsx:38`                                       | name       |                           | The same Route query the banner reads, so a refresh can retry it. The                               |
|  33 | `app/(app)/workout/[id].tsx:50`                                       | name       |                           | A loaded Route is never fetched again; a failed one is retried.                                     |
|  34 | `app/(app)/workout/[id].tsx:127`                                      | domain     |                           | `route` is `null` in planned mode.                                                                  |
|  35 | `app/(app)/workout/[id].tsx:156`                                      | name       |                           | With no Activity numbers to compare, the plan is shown on its own.                                  |
|  36 | `app/(auth)/_layout.tsx:7`                                            | name       |                           | The first reachable screen is where the user lands: sign-in when signed                             |
|  37 | `app/(auth)/forgot-password/__tests__/useForgotPassword.test.ts:32`   | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  38 | `app/(auth)/forgot-password/__tests__/useForgotPassword.test.ts:66`   | delete     |                           | Per-field rules live in forgotPasswordSchema.test.ts; these cover timing.                           |
|  39 | `app/(auth)/forgot-password/__tests__/useForgotPassword.test.ts:197`  | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  40 | `app/(auth)/forgot-password/useForgotPassword.ts:27`                  | name       |                           | The parsed email of the last successful send. Resend reuses it, not the                             |
|  41 | `app/(auth)/forgot-password/useForgotPassword.ts:33`                  | name       |                           | Send and resend hit the same endpoint, so they share one mutation.                                  |
|  42 | `app/(auth)/forgot-password/useForgotPassword.ts:51`                  | name       |                           | Every forgot-password server error is a form error.                                                 |
|  43 | `app/(auth)/forgot-password/useForgotPassword.ts:59`                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `sendReset.error`.                                                       |
|  44 | `app/(auth)/forgot-password/useForgotPassword.ts:67`                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `sendReset.error`.                                                       |
|  45 | `app/(auth)/sign-in/__tests__/useSignIn.test.ts:56`                   | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  46 | `app/(auth)/sign-in/__tests__/useSignIn.test.ts:103`                  | delete     |                           | Per-field rules live in signInSchema.test.ts; these cover timing.                                   |
|  47 | `app/(auth)/sign-in/useSignIn.ts:35`                                  | name       |                           | A fresh link for an account that still has to verify its email.                                     |
|  48 | `app/(auth)/sign-in/useSignIn.ts:50`                                  | workaround | rq-one-mutation-error     | Starting one mutation resets the other, so at most one has an error.                                |
|  49 | `app/(auth)/sign-in/useSignIn.ts:65`                                  | name       |                           | Sign-in errors are all form errors; none shows under a field.                                       |
|  50 | `app/(auth)/sign-in/useSignIn.ts:75`                                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `emailSignIn.error`.                                                     |
|  51 | `app/(auth)/sign-in/useSignIn.ts:85`                                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `googleSignIn.error`.                                                    |
|  52 | `app/(auth)/sign-up/__tests__/signUpSchema.test.ts:80`                | delete     |                           | Matches the hand-written validation this schema replaced.                                           |
|  53 | `app/(auth)/sign-up/__tests__/useSignUp.test.ts:56`                   | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  54 | `app/(auth)/sign-up/__tests__/useSignUp.test.ts:113`                  | delete     |                           | Per-field rules live in signUpSchema.test.ts; these cover timing.                                   |
|  55 | `app/(auth)/sign-up/signUpSchema.ts:17`                               | workaround | valibot-issue-order       | The mismatch comes after each field's own issue, and the resolver keeps                             |
|  56 | `app/(auth)/sign-up/useSignUp.ts:49`                                  | workaround | rq-one-mutation-error     | Starting one mutation resets the other, so at most one has an error.                                |
|  57 | `app/(auth)/sign-up/useSignUp.ts:64`                                  | name       |                           | Every sign-up server error is a form error.                                                         |
|  58 | `app/(auth)/sign-up/useSignUp.ts:66`                                  | name       |                           | Editing the password re-checks "passwords mismatch".                                                |
|  59 | `app/(auth)/sign-up/useSignUp.ts:76`                                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `emailSignUp.error`.                                                     |
|  60 | `app/(auth)/sign-up/useSignUp.ts:86`                                  | workaround | rq-swallow-mutateAsync    | A failure surfaces through `googleSignUp.error`.                                                    |
|  61 | `app/(auth)/verify-email/__tests__/useVerifyEmail.test.ts:39`         | name       |                           | What sign-up and sign-in do after the account signs in.                                             |
|  62 | `app/(auth)/verify-email/__tests__/useVerifyEmail.test.ts:46`         | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
|  63 | `app/(auth)/verify-email/__tests__/useVerifyEmail.test.ts:103`        | test       |                           | One email: the handler's. Resend did nothing.                                                       |
|  64 | `app/(auth)/verify-email/useVerifyEmail.ts:19`                        | workaround | auth-flow-ordering        | Sign-up and sign-in send the email; this screen never does. Resend opens                            |
|  65 | `app/(auth)/verify-email/useVerifyEmail.ts:34`                        | workaround | auth-flow-ordering        | The auth gate can open this screen before the handler records its send,                             |
|  66 | `app/(auth)/verify-email/useVerifyEmail.ts:47`                        | workaround | rq-error-channel          | Rejecting makes "still unverified" show like any other error.                                       |
|  67 | `app/(auth)/verify-email/useVerifyEmail.ts:72`                        | workaround | rq-swallow-mutateAsync    | A failure surfaces through `checkVerified.error`.                                                   |
|  68 | `app/(auth)/verify-email/useVerifyEmail.ts:81`                        | workaround | rq-swallow-mutateAsync    | A failure surfaces through `resend.error`.                                                          |
|  69 | `app/(auth)/verify-email/useVerifyEmail.ts:89`                        | workaround | swallowed-error           | sign-out errors are not actionable                                                                  |
|  70 | `app/(auth)/verify-email/useVerifyEmail.ts:93`                        | workaround | rq-one-mutation-error     | Starting one mutation resets the other, so at most one has an error.                                |
|  71 | `app/_layout.tsx:25`                                                  | workaround | dark-only-config          | The app is dark only, so system glass, sheets and alerts never turn light.                          |
|  72 | `app/_layout.tsx:36`                                                  | delete     |                           | Shift+M in `expo start`; a no-op in production builds.                                              |
|  73 | `app/_layout.tsx:39`                                                  | name       |                           | The splash stays up until the root view has laid out with fonts loaded,                             |
|  74 | `app/_layout.tsx:48`                                                  | name       |                           | The guards decide where the user may be. When one turns off,                                        |
|  75 | `app/_layout.tsx:52`                                                  | name       |                           | Blank until Firebase first reports the user.                                                        |
|  76 | `app/_layout.tsx:66`                                                  | name       |                           | Outside the navigator, so toasts survive navigation.                                                |
|  77 | `components/BottomSheet.tsx:60`                                       | workaround | sheet-dismiss-signal      | Expo UI's universal sheet has no "finished dismissing" event, but on both                           |
|  78 | `components/BottomSheet.tsx:73`                                       | name       |                           | Our own content view carries the theme padding and the full width.                                  |
|  79 | `components/BottomSheet.tsx:75`                                       | workaround | platform-branch           | On iOS 26 the sheet shows the system's Liquid Glass material, kept                                  |
|  80 | `components/BottomSheet.tsx:124`                                      | workaround | platform-branch           | On Android the sheet is a Dialog window above the root toast                                        |
|  81 | `components/RouteMap.tsx:79`                                          | workaround | maplibre-attribution      | Replaced by the button below, which a hidden map can't hide.                                        |
|  82 | `components/WorkoutProfile.tsx:66`                                    | name       |                           | Nothing to scale against, and nothing to draw: an empty profile, or one                             |
|  83 | `components/WorkoutProfile.tsx:79`                                    | workaround | eslint-disable-reason     | Blocks have no identity of their own: they are positions in a                                       |
|  84 | `components/WorkoutProfile.tsx:110`                                   | name       |                           | A slope has no flat top to round, so a ramp is drawn square.                                        |
|  85 | `components/WorkoutProfile.tsx:130`                                   | name       |                           | The rounded cap runs to the floor beneath the solid fill, which covers its                          |
|  86 | `components/calendar/CalendarDayTile.tsx:35`                          | name       |                           | Only the fill fades: dimming the whole tile would fade the day                                      |
|  87 | `components/calendar/CalendarMonthGrid.tsx:180`                       | name       |                           | Decoration only: the tile under it takes the tap and announces the                                  |
|  88 | `components/calendar/CalendarMonthGrid.tsx:287`                       | name       |                           | The rank icons sit beside the day number, so the dots below line                                    |
|  89 | `components/calendar/CalendarWeekAgenda.tsx:140`                      | workaround | a11y-grouping             | Not one grouped element, so a screen reader reaches the rail                                        |
|  90 | `components/calendar/CalendarWeekAgenda.tsx:202`                      | workaround | negative-margin-bleed     | Runs to the day's hairlines, past its padding, like the rail.                                       |
|  91 | `components/calendar/CalendarWeekAgenda.tsx:251`                      | workaround | negative-margin-bleed     | Runs to the day's hairlines, past its padding, so the whole height                                  |
|  92 | `components/fitness/FitnessChart.tsx:112`                             | workaround | sentinel-value            | -1 while nothing is touched.                                                                        |
|  93 | `components/route/RouteBanner.tsx:66`                                 | delete     |                           | No Route (`null`): the banner steps aside.                                                          |
|  94 | `components/route/RouteMapScreen.tsx:113`                             | workaround | a11y-tree-order           | First in the tree, so focus starts on it; drawn above the map.                                      |
|  95 | `components/route/RouteMapScreen.tsx:170`                             | name       |                           | The details exist, but the Activity turned out to have no Route.                                    |
|  96 | `components/route/RouteMapScreen.tsx:191`                             | name       |                           | The room kept clear above the screen's bottom edge for the chips.                                   |
|  97 | `components/route/RouteMapScreen.tsx:196`                             | workaround | a11y-tree-order           | The map as one image for the screen reader. It's framed between the                                 |
|  98 | `components/route/RouteMapScreen.tsx:248`                             | workaround | a11y-tree-order           | Last in the tree, so its attribution ⓘ (kept focusable while the                                    |
|  99 | `components/settings/SettingsSection.tsx:14`                          | name       |                           | Row horizontal padding (base = 16) + icon tile (28) + gap (md = 12).                                |
| 100 | `components/workout/DetailedProfileCard.tsx:61`                       | name       |                           | The scrub pointer's time, in s; `null` while it's hidden.                                           |
| 101 | `components/workout/ProfileWithTimeAxis.tsx:104`                      | workaround | reanimated-ui-js-bridge   | The pointer moves on the UI thread, and its whole-px column crosses to JS                           |
| 102 | `components/workout/ProfileWithTimeAxis.tsx:129`                      | workaround | sentinel-value            | The pointer may have been hidden since the last drag, so report it                                  |
| 103 | `components/workout/ProfileWithTimeAxis.tsx:210`                      | name       |                           | A lone profile needs no caption: the card says what it is.                                          |
| 104 | `components/workout/ProfileWithTimeAxis.tsx:294`                      | name       |                           | A bar too narrow to spare the hairline is drawn whole.                                              |
| 105 | `components/workout/ProfileWithTimeAxis.tsx:300`                      | name       |                           | A ramp is a solid slope from its start power to its end power, in                                   |
| 106 | `components/workout/TimeInZoneRows.tsx:60`                            | name       |                           | Every row has the same strips: the card's.                                                          |
| 107 | `components/workout/TimeInZoneRows.tsx:77`                            | name       |                           | The plan's bar above the ride's. A row has at least one.                                            |
| 108 | `components/workout/TimeInZoneRows.tsx:125`                           | workaround | a11y-grouping             | Each row already says which time is which.                                                          |
| 109 | `components/workout/WorkoutStravaCard.tsx:32`                         | delete     |                           | A neutral source mark, not an imitation of Strava's logo.                                           |
| 110 | `constants/legal.ts:1`                                                | delete     |                           | TODO: Replace with the real privacy policy and terms of service URLs. They                          |
| 111 | `constants/theme.ts:42`                                               | name       |                           | Semantic — backgrounds                                                                              |
| 112 | `constants/theme.ts:46`                                               | name       |                           | Semantic — text                                                                                     |
| 113 | `constants/theme.ts:52`                                               | name       |                           | Semantic — borders                                                                                  |
| 114 | `constants/theme.ts:56`                                               | name       |                           | Semantic — overlays                                                                                 |
| 115 | `constants/theme.ts:59`                                               | name       |                           | Semantic — surfaces. Sheen ends on the page colour so cards melt into it.                           |
| 116 | `constants/theme.ts:65`                                               | name       |                           | Placeholders and code inside a Sheen card: fainter than any control.                                |
| 117 | `constants/theme.ts:68`                                               | name       |                           | Semantic — interactive                                                                              |
| 118 | `constants/theme.ts:72`                                               | name       |                           | Status                                                                                              |
| 119 | `constants/theme.ts:81`                                               | name       |                           | Workout states                                                                                      |
| 120 | `constants/theme.ts:86`                                               | domain     |                           | Races: one fixed red, never the Race's own Intervals.icu colour                                     |
| 121 | `constants/theme.ts:89`                                               | domain     |                           | Fitness chart series, in intervals.icu's colours                                                    |
| 122 | `constants/theme.ts:150`                                              | delete     |                           | Headings                                                                                            |
| 123 | `constants/theme.ts:180`                                              | delete     |                           | Body — extra-large                                                                                  |
| 124 | `constants/theme.ts:189`                                              | delete     |                           | Body — large (16px)                                                                                 |
| 125 | `constants/theme.ts:205`                                              | delete     |                           | Body — small (14px)                                                                                 |
| 126 | `constants/theme.ts:221`                                              | delete     |                           | Body — extra-small (12px)                                                                           |
| 127 | `e2e/seed.ts:22`                                                      | workaround | e2e-env-ordering          | The suite refuses to start without the test user's credentials, but its                             |
| 128 | `e2e/seed.ts:27`                                                      | name       |                           | A personal API key is Basic auth with the username `API_KEY`.                                       |
| 129 | `e2e/seed.ts:34`                                                      | name       |                           | A `FormData` body goes as multipart, with the boundary `fetch` sets.                                |
| 130 | `e2e/seed.ts:103`                                                     | domain     |                           | Unpaired: no `paired_event_id`, so it's an Unplanned Activity.                                      |
| 131 | `e2e/support/__tests__/seedPlan.test.ts:116`                          | test       |                           | Intervals.icu workout syntax: section titles, and steps written as                                  |
| 132 | `e2e/support/seedPlan.ts:66`                                          | domain     |                           | Intervals.icu workout syntax, so the events come back with                                          |
| 133 | `e2e/support/seedPlan.ts:80`                                          | name       |                           | 18 minutes from Z1 to Z6 at the test athlete's FTP, so Activity Details has                         |
| 134 | `e2e/support/seedPlan.ts:97`                                          | workaround | e2e-timezone              | Noon keeps the ride on today wherever Intervals.icu places the athlete                              |
| 135 | `e2e/support/seedPlan.ts:147`                                         | name       |                           | Day 0 of a month is the last day of the month before it.                                            |
| 136 | `e2e/support/signIn.ts:22`                                            | workaround | e2e-ios-keyboard          | Submit with the keyboard's Done key, which runs the form's submit. On                               |
| 137 | `e2e/support/signIn.ts:27`                                            | workaround | e2e-system-ui             | iOS may offer to save the password in a system sheet over the app, in                               |
| 138 | `e2e/support/targetPlan.ts:51`                                        | workaround | e2e-device-tooling        | Drawing touches onto a hosted recording can outlast the cleanup timeout.                            |
| 139 | `e2e/tests/activity-details-profile.e2e.ts:22`                        | workaround | e2e-a11y-merged-label     | The card is one image to the accessibility tree, so its axis labels                                 |
| 140 | `e2e/tests/activity-details-profile.e2e.ts:36`                        | name       |                           | Sideways across the plot, which fills the card above its time axis.                                 |
| 141 | `e2e/tests/activity-details-profile.e2e.ts:45`                        | workaround | e2e-a11y-merged-label     | The pointer stays after the finger lifts. On iOS the readout's rows sit                             |
| 142 | `e2e/tests/calendar-week.e2e.ts:19`                                   | workaround | e2e-a11y-merged-label     | The view toggle sits in the Calendar header, under iOS's "Toolbar".                                 |
| 143 | `e2e/tests/calendar-week.e2e.ts:22`                                   | workaround | e2e-a11y-merged-label     | Each day's rail is read as "<Weekday>, <day> <month>", and today's ends                             |
| 144 | `e2e/tests/calendar-week.e2e.ts:29`                                   | workaround | e2e-a11y-merged-label     | A row is one button read by its composed label, its Workout Status                                  |
| 145 | `e2e/tests/calendar.e2e.ts:21`                                        | workaround | e2e-a11y-merged-label     | Each day is one accessible button, so iOS hides the `calendar-today`                                |
| 146 | `e2e/tests/calendar.e2e.ts:27`                                        | name       |                           | The chevron has no visible text, only its accessibility label.                                      |
| 147 | `e2e/tests/calendar.e2e.ts:31`                                        | workaround | e2e-a11y-merged-label     | The day's label is "<day>. <counts>", Workouts first, e.g.                                          |
| 148 | `e2e/tests/note-details.e2e.ts:13`                                    | workaround | e2e-a11y-merged-label     | The card is one button read by its own label, so iOS hides the visible                              |
| 149 | `e2e/tests/note-details.e2e.ts:18`                                    | workaround | e2e-scroll-clear-tabbar   | The card can stop under the tab bar, above only E2E Goal Race, so swipe                             |
| 150 | `e2e/tests/note-details.e2e.ts:23`                                    | workaround | e2e-stacked-screen-tree   | The Home card stays in the tree under Note Details, so match the title                              |
| 151 | `e2e/tests/note-details.e2e.ts:42`                                    | workaround | e2e-a11y-merged-label     | The day's label is "<day>. <counts>", Notes last.                                                   |
| 152 | `e2e/tests/note-details.e2e.ts:48`                                    | name       |                           | In the day sheet a Note card's label ends in the sheet's day, not "Dziś".                           |
| 153 | `e2e/tests/note-details.e2e.ts:56`                                    | name       |                           | A pushed screen's back arrow, which no sheet has.                                                   |
| 154 | `e2e/tests/note-details.e2e.ts:65`                                    | test       |                           | The sheet runs its chained action once, so one back returns to the                                  |
| 155 | `e2e/tests/races-calendar.e2e.ts:19`                                  | workaround | e2e-month-edge            | On the last day of a month, tomorrow's cell in this month's grid is a                               |
| 156 | `e2e/tests/races-calendar.e2e.ts:26`                                  | workaround | e2e-a11y-merged-label     | The day's label is "<day>. <counts>", Races first.                                                  |
| 157 | `e2e/tests/races-home.e2e.ts:15`                                      | name       |                           | `/i` because the A Race's eyebrow is drawn in capitals.                                             |
| 158 | `e2e/tests/races-home.e2e.ts:25`                                      | workaround | e2e-a11y-merged-label     | The card and the tile are each one button read by its own label, so iOS                             |
| 159 | `e2e/tests/races-home.e2e.ts:43`                                      | workaround | e2e-scroll-clear-tabbar   | The tile can stop under the tab bar, the last of "Dziś i jutro" below                               |
| 160 | `e2e/tests/sign-in.e2e.ts:15`                                         | test       |                           | The root route stays blank until Firebase restores the session, then the                            |
| 161 | `e2e/tests/sign-in.e2e.ts:31`                                         | test       |                           | Signing in with an unverified email sends the verification email, so                                |
| 162 | `e2e/tests/sign-in.e2e.ts:35`                                         | test       |                           | A cold start sends nothing, so Resend is ready straight away.                                       |
| 163 | `e2e/tests/sign-out.e2e.ts:16`                                        | name       |                           | The row is the last one in a scroll view; on a short screen it starts                               |
| 164 | `e2e/tests/sign-out.e2e.ts:21`                                        | workaround | e2e-system-ui             | React Native's `Alert` is the platform's own dialog inside the app, and                             |
| 165 | `e2e/tests/sign-out.e2e.ts:32`                                        | test       |                           | The root route stays blank until Firebase restores the session, so the                              |
| 166 | `e2e/tests/workout-details.e2e.ts:21`                                 | workaround | e2e-stacked-screen-tree   | The Home tile stays in the tree under Workout Details, and its label                                |
| 167 | `functions/src/account/deleteAccount.ts:16`                           | workaround | firebase-reauth           | The Admin SDK skips Firebase's own recent-login check, so this is the                               |
| 168 | `functions/src/account/deleteAccount.ts:38`                           | workaround | firebase-reauth           | Deleted last so that a retry after a partial failure still passes the                               |
| 169 | `hooks/__tests__/useActivityRoute.test.ts:201`                        | test       |                           | Resolves immediately: by the next microtask, with no request in flight.                             |
| 170 | `hooks/__tests__/useFormTextField.test.ts:51`                         | workaround | rq-settle-tick            | RHF focuses on the next tick.                                                                       |
| 171 | `hooks/__tests__/useScrolledUnderHeader.test.ts:32`                   | test       |                           | The block spans 116..236 in the scroll content.                                                     |
| 172 | `hooks/__tests__/useScrolledUnderHeader.test.ts:74`                   | test       |                           | A refresh brings a longer title, pushing the block's bottom down.                                   |
| 173 | `hooks/__tests__/useToday.test.ts:58`                                 | test       |                           | Suspended through midnight: the clock moves on, but no timer fires.                                 |
| 174 | `hooks/activity/__tests__/useActivityDetails.test.ts:349`             | test       |                           | A WeightTraining Activity as intervals.icu returns it: every other                                  |
| 175 | `hooks/activity/__tests__/useActivityDetails.test.ts:513`             | name       |                           | The body intervals.icu returns for a Strava Activity, as verified.                                  |
| 176 | `hooks/activity/__tests__/useActivityDetails.test.ts:542`             | name       |                           | A slice of the ~71 KB body: the fields Activity Details needs, plus                                 |
| 177 | `hooks/activity/useActivityDetails.ts:20`                             | workaround | rq-render-tracking        | `buildActivityDetails` is a stable module function and doesn't depend on                            |
| 178 | `hooks/activity/useActivityDetails.ts:28`                             | workaround | rq-render-tracking        | Goes through the client rather than `query.refetch`: reading a property                             |
| 179 | `hooks/calendar/__tests__/useCalendarRange.test.ts:145`               | workaround | jest-global-reset         | Hands focus back to the default listener for the next test.                                         |
| 180 | `hooks/calendar/__tests__/useCalendarRange.test.ts:430`               | test       |                           | Back to the loaded month: its data is there at once, with no new fetch.                             |
| 181 | `hooks/calendar/__tests__/useCalendarRange.test.ts:511`               | test       |                           | A background refetch shows the old data meanwhile.                                                  |
| 182 | `hooks/calendar/__tests__/useCalendarRange.test.ts:525`               | test       |                           | Aged after mounting, so only the return to the foreground can refetch.                              |
| 183 | `hooks/calendar/__tests__/useCalendarRange.test.ts:576`               | test       |                           | A retry with no data is a first load again, not a refresh.                                          |
| 184 | `hooks/calendar/__tests__/useCalendarRange.test.ts:615`               | test       |                           | Off screen, Home's workouts are only marked stale. The refetched month                              |
| 185 | `hooks/calendar/__tests__/useWeeklyCalendar.test.ts:97`               | name       |                           | Wed 30 Dec 2020, in the week of Mon 28 Dec 2020 – Sun 3 Jan 2021.                                   |
| 186 | `hooks/calendar/__tests__/useWeeklyCalendar.test.ts:129`              | test       |                           | Sat 2 Jan 2021 is in December's pairing window as well as in January.                               |
| 187 | `hooks/calendar/__tests__/useWeeklyCalendar.test.ts:186`              | name       |                           | Sun 1 Nov 2026, in the week of Mon 26 Oct – Sun 1 Nov 2026.                                         |
| 188 | `hooks/calendar/__tests__/useWeeklyCalendar.test.ts:216`              | test       |                           | As if the monthly view had loaded the month(s) this week falls in.                                  |
| 189 | `hooks/calendar/useCalendarRange.ts:77`                               | workaround | memo-for-identity         | Stable per range, so `useQueries` only re-combines when a result changes.                           |
| 190 | `hooks/calendar/useCalendarRange.ts:83`                               | workaround | memo-for-identity         | Stable per day, so a month's statuses are only re-derived when it changes.                          |
| 191 | `hooks/calendar/useCalendarRange.ts:95`                               | name       |                           | Marks everything for the athlete stale: what's on screen fetches again                              |
| 192 | `hooks/calendar/useDaySheet.ts:44`                                    | workaround | sheet-close-on-reload     | A reload or disconnect hides the sheet; it must not pop back open when                              |
| 193 | `hooks/fitness/__tests__/useFitnessChart.test.ts:78`                  | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
| 194 | `hooks/fitness/useFitnessChart.ts:38`                                 | workaround | scope-gate                | Skipped like a missing connection when the stored scope lacks Wellness,                             |
| 195 | `hooks/home/__tests__/useNextRace.test.ts:52`                         | delete     |                           | Shaped like the live Race bodies in #280.                                                           |
| 196 | `hooks/home/__tests__/useTodayCards.test.ts:112`                      | workaround | rq-settle-tick            | React Query hands the settled state to the hook on a later tick.                                    |
| 197 | `hooks/home/__tests__/useUpcomingWorkouts.test.ts:180`                | test       |                           | The events call and the Notes call, as before Races.                                                |
| 198 | `hooks/home/useTodayCards.ts:48`                                      | workaround | scope-gate                | Skipped like a missing connection until the stored scope has arrived, and                           |
| 199 | `hooks/useActivityRoute.ts:21`                                        | workaround | rq-render-tracking        | Goes through the client rather than `query.refetch`, as in                                          |
| 200 | `hooks/useCooldown.ts:20`                                             | name       |                           | When the cooldown ends, in epoch ms, or null before it is first started.                            |
| 201 | `hooks/useCooldown.ts:25`                                             | workaround | clock-subscription        | Listens to the clock until the tick that reaches `endsAt`, so the clock                             |
| 202 | `hooks/useCooldown.ts:45`                                             | workaround | clock-subscription        | The clock's last tick can be up to a second before `start`, so cap at                               |
| 203 | `hooks/useFormTextField.ts:37`                                        | name       |                           | A validation error wins over a server error on the same field.                                      |
| 204 | `hooks/useIntervalsAuth.ts:65`                                        | workaround | intervals-reconnect-cache | Re-enables the gated queries; the 401 already removed the old data.                                 |
| 205 | `hooks/useIntervalsAuth.ts:67`                                        | workaround | intervals-reconnect-cache | Refetches under the new consent, athlete settings included, which                                   |
| 206 | `hooks/useIntervalsAuth.ts:85`                                        | workaround | intervals-reconnect-cache | Otherwise reconnecting the same athlete would show the old data.                                    |
| 207 | `hooks/useIntervalsAuth.ts:94`                                        | workaround | rq-swallow-mutateAsync    | A failure surfaces as a toast via `onError`.                                                        |
| 208 | `hooks/useSurfaceContrast.ts:10`                                      | workaround | module-store              | One store for every surface, so a card mounting mid-scroll paints with the                          |
| 209 | `hooks/workout/__tests__/useProfileCard.test.ts:144`                  | test       |                           | The ride kept no FTP of its own, so it's drawn at the current one.                                  |
| 210 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:235`               | workaround | intervals-api-quirk       | The single read lacks `paired_activity_id` (#191), so the event is                                  |
| 211 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:487`               | domain     |                           | 80% FTP sits in Coggan's zone 3 (75–90%).                                                           |
| 212 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:499`               | test       |                           | So its profile card is drawn in %FTP, and never waits on them.                                      |
| 213 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:1109`              | domain     |                           | 80% FTP sits in Coggan's zone 3 (75–90%).                                                           |
| 214 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:1131`              | domain     |                           | Coggan's zone 2 runs from 55% to 75% FTP.                                                           |
| 215 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:1161`              | test       |                           | Coloured by its middle, 60% FTP: Coggan's zone 2.                                                   |
| 216 | `hooks/workout/__tests__/useWorkoutDetails.test.ts:1174`              | test       |                           | Coloured by its middle, 91% FTP: Coggan's zone 4 (90–105%).                                         |
| 217 | `hooks/workout/useWorkoutDetails.ts:23`                               | workaround | memo-for-identity         | Stable per day, so the view model is only rebuilt when the day changes.                             |
| 218 | `hooks/workout/useWorkoutDetails.ts:32`                               | workaround | rq-render-tracking        | Goes through the client rather than `query.refetch`: reading a property                             |
| 219 | `i18n/index.ts:10`                                                    | workaround | eslint-disable-reason     | i18next documents `use` on the default instance; the named export is the same function.             |
| 220 | `i18n/locales/pl.ts:12`                                               | delete     |                           | Validation messages shared across forms (ADR 0006).                                                 |
| 221 | `lib/__tests__/appFocus.test.ts:23`                                   | test       |                           | Captures the setup instead of running it against the real AppState.                                 |
| 222 | `lib/__tests__/calendarGrid.test.ts:5`                                | name       |                           | Thu 8 Oct 2026                                                                                      |
| 223 | `lib/__tests__/calendarGrid.test.ts:27`                               | name       |                           | Thu 31 Dec 2026                                                                                     |
| 224 | `lib/__tests__/calendarGrid.test.ts:42`                               | name       |                           | October 2026 starts on a Thursday                                                                   |
| 225 | `lib/__tests__/calendarGrid.test.ts:67`                               | name       |                           | February 2021                                                                                       |
| 226 | `lib/__tests__/calendarGrid.test.ts:76`                               | name       |                           | August 2026: Sat 1st – Mon 31st                                                                     |
| 227 | `lib/__tests__/calendarItems.test.ts:95`                              | workaround | intervals-api-quirk       | Shaped like #184: intervals.icu blanks a Strava Activity's own                                      |
| 228 | `lib/__tests__/calendarView.test.ts:12`                               | test       |                           | October 2026; Thu 15 Oct is in the week of Mon 12 Oct.                                              |
| 229 | `lib/__tests__/calendarView.test.ts:19`                               | test       |                           | October 2026 starts on a Thursday; Fri 2 Oct is in the week of Mon 28 Sep.                          |
| 230 | `lib/__tests__/calendarView.test.ts:26`                               | test       |                           | Sat 31 Oct 2026 is in the week of Mon 26 Oct, which ends on 1 Nov.                                  |
| 231 | `lib/__tests__/calendarView.test.ts:33`                               | test       |                           | October 2026 starts on a Thursday; today is in November.                                            |
| 232 | `lib/__tests__/calendarView.test.ts:42`                               | test       |                           | Mon 28 Sep – Sun 4 Oct 2026, with today in October.                                                 |
| 233 | `lib/__tests__/calendarView.test.ts:49`                               | test       |                           | Mon 28 Dec 2026 – Sun 3 Jan 2027, with today in January.                                            |
| 234 | `lib/__tests__/calendarWorkouts.test.ts:16`                           | name       |                           | 2026-10-12 is a Monday.                                                                             |
| 235 | `lib/__tests__/detailedProfile.test.ts:26`                            | test       |                           | A 100 W ride under a 137.5 W edge fits; under one twice as far it doesn't.                          |
| 236 | `lib/__tests__/detailedProfile.test.ts:36`                            | test       |                           | 200 × 1.05 is 210.00000000000003 in floating point.                                                 |
| 237 | `lib/__tests__/detailedProfile.test.ts:274`                           | test       |                           | 110% of 250 W peaks at 275 W, under the 300 W Z5 edge.                                              |
| 238 | `lib/__tests__/detailedProfile.test.ts:288`                           | test       |                           | The ride peaks at 130% of its own 240 W FTP: 312 W, past the plan's 275 W.                          |
| 239 | `lib/__tests__/detailedProfile.test.ts:327`                           | test       |                           | The ride keeps its watts, but sits on the scale in %FTP.                                            |
| 240 | `lib/__tests__/detailedProfile.test.ts:336`                           | domain     |                           | Coggan's Z7 runs from 150% to 200%; a 210% sprint sits in it all the same.                          |
| 241 | `lib/__tests__/detailedProfile.test.ts:355`                           | test       |                           | Activity Details: the ride kept its FTP, but the athlete has none today.                            |
| 242 | `lib/__tests__/detailedProfile.test.ts:372`                           | test       |                           | 1800 s at 150 W, then 1800 s at 250–275 W, read at its 262.5 W middle.                              |
| 243 | `lib/__tests__/detailedProfile.test.ts:536`                           | test       |                           | 100 px for 375 W: 225 W and 300 W sit under 12 px from the labels below.                            |
| 244 | `lib/__tests__/fitnessChart.test.ts:5`                                | name       |                           | A Friday.                                                                                           |
| 245 | `lib/__tests__/fitnessChart.test.ts:25`                               | test       |                           | A 28 pt label gutter leaves a 420 pt plot: 10 pt a slot over 42 days. The                           |
| 246 | `lib/__tests__/fitnessChart.test.ts:95`                               | test       |                           | Days 10–12 have no values.                                                                          |
| 247 | `lib/__tests__/fitnessChart.test.ts:114`                              | test       |                           | A new athlete: values only on the last 5 days.                                                      |
| 248 | `lib/__tests__/fitnessChart.test.ts:138`                              | test       |                           | The bottom panel's 36 pt sit under the top one's 64 pt and the gap.                                 |
| 249 | `lib/__tests__/fitnessChart.test.ts:147`                              | name       |                           | Form -23                                                                                            |
| 250 | `lib/__tests__/fitnessChart.test.ts:149`                              | name       |                           | Form +7                                                                                             |
| 251 | `lib/__tests__/fitnessChart.test.ts:167`                              | test       |                           | Fatigue 120 on one day; with headroom over it, the scale tops at 150.                               |
| 252 | `lib/__tests__/fitnessChart.test.ts:174`                              | test       |                           | The top panel's 64 pt start under room for the top label.                                           |
| 253 | `lib/__tests__/fitnessChart.test.ts:208`                              | test       |                           | Day 3 is a rest day, day 4 has no values.                                                           |
| 254 | `lib/__tests__/fitnessChart.test.ts:222`                              | test       |                           | About 60% of the 10 pt slot.                                                                        |
| 255 | `lib/__tests__/fitnessChart.test.ts:239`                              | test       |                           | The top panel's 64 pt end at 70: the tallest bar takes 55% of them.                                 |
| 256 | `lib/__tests__/fitnessChart.test.ts:247`                              | test       |                           | A year's slots on 420 pt are about 1.15 pt each.                                                    |
| 257 | `lib/__tests__/fitnessChart.test.ts:278`                              | test       |                           | 26 Sep (a Saturday) to 6 Nov.                                                                       |
| 258 | `lib/__tests__/fitnessChart.test.ts:289`                              | test       |                           | 28 Sep is the third day.                                                                            |
| 259 | `lib/__tests__/fitnessChart.test.ts:294`                              | test       |                           | 8 Aug to 6 Nov.                                                                                     |
| 260 | `lib/__tests__/fitnessChart.test.ts:305`                              | test       |                           | 7 Nov 2025 to 6 Nov 2026: the same months stay marked as days pass.                                 |
| 261 | `lib/__tests__/intervalsQueries.test.ts:303`                          | test       |                           | This athlete's Z2 is 60–80% FTP, not the Coggan 55–75%.                                             |
| 262 | `lib/__tests__/intervalsQueries.test.ts:697`                          | test       |                           | Started in the look-back, still covers 1–2 February.                                                |
| 263 | `lib/__tests__/intervalsQueries.test.ts:704`                          | test       |                           | Ended before the month began.                                                                       |
| 264 | `lib/__tests__/intervalsQueries.test.ts:787`                          | test       |                           | Planned in March, ridden in February: shows in February.                                            |
| 265 | `lib/__tests__/intervalsQueries.test.ts:794`                          | test       |                           | Planned in February, ridden in March: shows in March.                                               |
| 266 | `lib/__tests__/localDateTime.test.ts:39`                              | test       |                           | 25 Oct 2026 is the end of DST in Europe; 1 Nov 2026 in the US.                                      |
| 267 | `lib/__tests__/noteBars.test.ts:16`                                   | name       |                           | October 2026 starts on a Thursday.                                                                  |
| 268 | `lib/__tests__/noteBars.test.ts:79`                                   | test       |                           | Lane 0 is free again once the camp ends.                                                            |
| 269 | `lib/__tests__/noteBars.test.ts:103`                                  | test       |                           | 2 – 13 October: starts in the first row, runs through the second and                                |
| 270 | `lib/__tests__/noteBars.test.ts:116`                                  | test       |                           | A new row's segment starts at its first cell, where the label goes.                                 |
| 271 | `lib/__tests__/noteBars.test.ts:136`                                  | name       |                           | 27 September – 2 October and 30 October – 2 November.                                               |
| 272 | `lib/__tests__/noteBars.test.ts:144`                                  | test       |                           | The real start lies outside the month, so the bar runs off square.                                  |
| 273 | `lib/__tests__/noteBars.test.ts:200`                                  | test       |                           | 48-point cells 2 apart make a 348-point row, cell N starting at 50 × N.                             |
| 274 | `lib/__tests__/noteBars.test.ts:221`                                  | test       |                           | 30-point cells 2 apart: a 222-point row, cell N starting at 32 × N.                                 |
| 275 | `lib/__tests__/notes.test.ts:120`                                     | test       |                           | Ended (exclusively) on the first day: out.                                                          |
| 276 | `lib/__tests__/notes.test.ts:122`                                     | test       |                           | Started earlier, still running on the first day: in.                                                |
| 277 | `lib/__tests__/notes.test.ts:124`                                     | test       |                           | Inside the range: in.                                                                               |
| 278 | `lib/__tests__/notes.test.ts:126`                                     | test       |                           | Starts on the last day: in.                                                                         |
| 279 | `lib/__tests__/notes.test.ts:128`                                     | test       |                           | Starts after the last day: out.                                                                     |
| 280 | `lib/__tests__/powerZones.test.ts:83`                                 | domain     |                           | Sweet Spot overlaps Z3/Z4, so it must never become a resolvable zone.                               |
| 281 | `lib/__tests__/powerZones.test.ts:144`                                | test       |                           | 78% FTP is Z3 under Coggan but Z2 for this athlete.                                                 |
| 282 | `lib/__tests__/profileBars.test.ts:11`                                | test       |                           | 102px wide with one 2px gap leaves 100px: 75 and 25.                                                |
| 283 | `lib/__tests__/profileBars.test.ts:26`                                | test       |                           | Ceiling 200% FTP on a 50px plot: 4% FTP per px, y measured from the top.                            |
| 284 | `lib/__tests__/profileBars.test.ts:80`                                | test       |                           | 29 gaps of 2px would take 58px of a 30px tile.                                                      |
| 285 | `lib/__tests__/profileReadout.test.ts:31`                             | test       |                           | A stop from 900 s to 960 s, then a ride home that ends at 1200 s.                                   |
| 286 | `lib/__tests__/profileReadout.test.ts:67`                             | test       |                           | A ride with no stream: two long blocks rather than 2 px buckets.                                    |
| 287 | `lib/__tests__/profileReadout.test.ts:197`                            | test       |                           | The plan ends at 2400 s; the ride stops from 3000 s to 3300 s.                                      |
| 288 | `lib/__tests__/races.test.ts:11`                                      | delete     |                           | Shaped like the live Race bodies in #280.                                                           |
| 289 | `lib/__tests__/route.test.ts:47`                                      | name       |                           | At this latitude, 0.00001° of latitude is about 1.1 m.                                              |
| 290 | `lib/__tests__/route.test.ts:67`                                      | name       |                           | About 10 m north of the straight line.                                                              |
| 291 | `lib/__tests__/route.test.ts:78`                                      | name       |                           | About 3 m north of the straight line.                                                               |
| 292 | `lib/__tests__/routeMapData.test.ts:4`                                | delete     |                           | Kraków: Błonia → Wawel → Kazimierz.                                                                 |
| 293 | `lib/__tests__/secondClock.test.ts:3`                                 | workaround | module-store              | The clock is module state shared by every test, so each test's listeners                            |
| 294 | `lib/__tests__/splashScreen.test.ts:16`                               | workaround | jest-module-reset         | A fresh module per test, so an earlier test's hide doesn't count.                                   |
| 295 | `lib/__tests__/splashScreen.test.ts:41`                               | workaround | jest-flush-promises       | An unhandled rejection would fail the test once the hide settles.                                   |
| 296 | `lib/__tests__/sportIcon.test.ts:71`                                  | test       |                           | Matches both the ride pattern (`Ride$`) and the winter one (`Snow`).                                |
| 297 | `lib/__tests__/surfaceTreatment.test.ts:160`                          | test       |                           | Its 50% white edge is already brighter than `hairlineStrong`.                                       |
| 298 | `lib/__tests__/surfaceTreatment.test.ts:185`                          | test       |                           | Its label is near-black `textInverse`, which can't be read on                                       |
| 299 | `lib/__tests__/timeInZone.test.ts:116`                                | test       |                           | 58% is Z2 on Coggan's zones but Z1 under a 60% ceiling.                                             |
| 300 | `lib/__tests__/timeInZone.test.ts:161`                                | test       |                           | 45→75% spends a third of its span below the 55% edge.                                               |
| 301 | `lib/__tests__/timeInZone.test.ts:192`                                | test       |                           | 140→240%: 10 points in Z6, the other 90 above Z7's 150% floor.                                      |
| 302 | `lib/__tests__/weekNotes.test.ts:9`                                   | name       |                           | Monday 19 – Sunday 25 October 2026.                                                                 |
| 303 | `lib/__tests__/weekNotes.test.ts:51`                                  | name       |                           | Tuesday to Thursday                                                                                 |
| 304 | `lib/__tests__/weekNotes.test.ts:79`                                  | name       |                           | to Tuesday                                                                                          |
| 305 | `lib/__tests__/weekNotes.test.ts:93`                                  | name       |                           | to next Tuesday                                                                                     |
| 306 | `lib/__tests__/weekNotes.test.ts:106`                                 | name       |                           | to Thursday                                                                                         |
| 307 | `lib/__tests__/weekNotes.test.ts:107`                                 | name       |                           | Tuesday to Wednesday                                                                                |
| 308 | `lib/__tests__/weekNotes.test.ts:108`                                 | name       |                           | into next week                                                                                      |
| 309 | `lib/__tests__/weekNotes.test.ts:128`                                 | test       |                           | Lane 0 and 1 are free by now, but Wyjazd stays in lane 2.                                           |
| 310 | `lib/__tests__/weekNotes.test.ts:134`                                 | name       |                           | into next week                                                                                      |
| 311 | `lib/__tests__/weekNotes.test.ts:170`                                 | name       |                           | single day                                                                                          |
| 312 | `lib/__tests__/weekNotes.test.ts:171`                                 | name       |                           | multi-day, starts Wednesday                                                                         |
| 313 | `lib/__tests__/weekNotes.test.ts:172`                                 | name       |                           | single day                                                                                          |
| 314 | `lib/__tests__/weekNotes.test.ts:173`                                 | name       |                           | multi-day, started Tuesday: no row on Wednesday                                                     |
| 315 | `lib/__tests__/weekNotes.test.ts:174`                                 | name       |                           | multi-day, starts Wednesday                                                                         |
| 316 | `lib/__tests__/weekNotes.test.ts:187`                                 | name       |                           | ended on the Sunday before                                                                          |
| 317 | `lib/__tests__/weekNotes.test.ts:188`                                 | name       |                           | next week only                                                                                      |
| 318 | `lib/__tests__/weekNotes.test.ts:189`                                 | name       |                           | single day, the Sunday before                                                                       |
| 319 | `lib/__tests__/workoutDetails.test.ts:157`                            | test       |                           | 58% is Z1 under this athlete's 60% ceiling, not Coggan's Z2.                                        |
| 320 | `lib/__tests__/workoutProfile.test.ts:4`                              | test       |                           | Spelled out rather than resolved, so these expectations stay pinned to the                          |
| 321 | `lib/__tests__/workoutProfile.test.ts:233`                            | domain     |                           | Sweet Spot straddles Z3/Z4, so it must resolve to the underlying zone.                              |
| 322 | `lib/__tests__/workoutProfile.test.ts:245`                            | name       |                           | 2x20 threshold: 10min ramp, 20min on, 5min off, 20min on, 5min cooldown.                            |
| 323 | `lib/__tests__/workoutProfile.test.ts:332`                            | test       |                           | Skipped steps hand their width over, so a 20min interval next to a 60min                            |
| 324 | `lib/__tests__/workoutProfile.test.ts:371`                            | test       |                           | A 30s sprint is 0.4% of a 2h ride: a hairline without the floor.                                    |
| 325 | `lib/__tests__/workoutProfile.test.ts:388`                            | name       |                           | 30x 10s on / 50s off: every burst is under the floor on its own.                                    |
| 326 | `lib/__tests__/workoutProfile.test.ts:403`                            | test       |                           | 150 blocks cannot all clear the floor, so proportions win over visibility.                          |
| 327 | `lib/__tests__/workoutProfile.test.ts:420`                            | workaround | intervals-api-quirk       | "6x 3 min on / 2 min off" as intervals.icu sends it: the parent carries                             |
| 328 | `lib/__tests__/workoutProfile.test.ts:454`                            | name       |                           | 2x [ 3x (30s on / 30s off), 5 min easy ]                                                            |
| 329 | `lib/__tests__/workoutProfile.test.ts:479`                            | test       |                           | 1200s of drawable reps against a 1000s free ride: drawable is a                                     |
| 330 | `lib/appVersion.ts:1`                                                 | name       |                           | A missing appEnv labels as staging, matching app.config.ts's default.                               |
| 331 | `lib/authState.ts:10`                                                 | workaround | firebase-auth-listener    | `onUserChanged`, not `onAuthStateChanged`: only the former fires after                              |
| 332 | `lib/authState.ts:22`                                                 | workaround | module-store              | With nothing listening, the last state could go stale.                                              |
| 333 | `lib/calendarDayCounts.ts:45`                                         | name       |                           | The day's items lead with its Races, already in Race order.                                         |
| 334 | `lib/calendarDayCounts.ts:57`                                         | name       |                           | The day's items lead with its Races, already in Race order.                                         |
| 335 | `lib/calendarGrid.ts:51`                                              | workaround | dst-rounding              | Rounded because a DST change makes the gap 23 or 25 hours off a whole day.                          |
| 336 | `lib/calendarItems.ts:169`                                            | name       |                           | Stable, and Workouts go in before Activities, so they lead on a tie.                                |
| 337 | `lib/combineMonthResults.ts:60`                                       | name       |                           | Merging months loses the order each one had, so sort again.                                         |
| 338 | `lib/detailedProfile.ts:97`                                           | workaround | float-rounding            | Rounded to a millionth first: 200 × 1.05 is 210.00000000000003, which                               |
| 339 | `lib/detailedProfile.ts:206`                                          | name       |                           | In the strip's watts when it has an FTP to read them by.                                            |
| 340 | `lib/detailedProfile.ts:216`                                          | name       |                           | A strip that draws nothing, such as a ride at 0 W throughout, reads as 0.                           |
| 341 | `lib/externalStore.ts:12`                                             | workaround | module-store              | Arrow functions, so a store can export `subscribe` on its own.                                      |
| 342 | `lib/fitnessChart.ts:122`                                             | name       |                           | The half is rounded to a whole tick, so its label is exact.                                         |
| 343 | `lib/handleIntervalsAuthError.ts:15`                                  | workaround | intervals-reconnect-cache | First, so every Intervals query is disabled before the wipe below — a                               |
| 344 | `lib/handleIntervalsAuthError.ts:20`                                  | workaround | swallowed-error           | Best-effort: even if the integration doc can't be deleted (offline,                                 |
| 345 | `lib/intervalsApi.ts:297`                                             | workaround | intervals-api-quirk       | A multi-value param is one comma-joined value, e.g. `RACE_A,RACE_B`.                                |
| 346 | `lib/noteDates.ts:32`                                                 | workaround | date-getday-sunday        | getDay() counts from Sunday; the labels start on Monday.                                            |
| 347 | `lib/pairing.ts:84`                                                   | workaround | intervals-api-quirk       | An empty id names nothing.                                                                          |
| 348 | `lib/profileCard.ts:87`                                               | name       |                           | A plan with no known duration can't be placed in time beside the ride.                              |
| 349 | `lib/profilePlot.ts:83`                                               | workaround | type-shape-forcing        | A card always has at least one strip.                                                               |
| 350 | `lib/profileReadout.ts:17`                                            | name       |                           | The last segment that starts by `seconds`: the segments are time-ordered.                           |
| 351 | `lib/profileReadout.ts:138`                                           | workaround | type-shape-forcing        | On the watts scale every strip has an FTP, so its segments have watts.                              |
| 352 | `lib/queryClient.ts:10`                                               | workaround | swallowed-error           | The handler's last step, the Firestore delete, is best-effort.                                      |
| 353 | `lib/queryClient.ts:17`                                               | name       |                           | Data lasts the whole session and only gets fresher through an                                       |
| 354 | `lib/queryClient.ts:22`                                               | name       |                           | Any future retry count must never retry an IntervalsAuthError — the                                 |
| 355 | `lib/races.ts:58`                                                     | workaround | intervals-api-quirk       | intervals.icu always sets it; `Other` is its own catch-all sport.                                   |
| 356 | `lib/route.ts:169`                                                    | name       |                           | An explicit stack, so a long ride can't overflow the call stack.                                    |
| 357 | `lib/signOutAndClear.ts:16`                                           | workaround | swallowed-error           | No Google session (email/password user) or it is already gone — the                                 |
| 358 | `lib/splashScreen.ts:13`                                              | workaround | swallowed-error           | Nothing in the app can recover from a failed hide, so it is dropped                                 |
| 359 | `lib/surfaceTreatment.ts:100`                                         | name       |                           | A prominent control's near-black label can't be read on `bgTertiary`,                               |
| 360 | `lib/surfaceTreatment.ts:109`                                         | name       |                           | A prominent control's edge is already brighter than `hairlineStrong`.                               |
| 361 | `lib/toast/ToastHost.tsx:35`                                          | workaround | sonner-config             | sonner's collapsed stack expands on tap and pauses every timer, so                                  |
| 362 | `lib/toast/ToastHost.tsx:54`                                          | workaround | sonner-config             | Overrides sonner's default '600', which Android would fake-bold.                                    |
| 363 | `lib/toast/ToastHost.tsx:104`                                         | workaround | sonner-config             | Fills the sheet like the host's own absolute layer did, and lets touches                            |
| 364 | `lib/toast/__tests__/toast.test.ts:44`                                | workaround | jest-module-reset         | A fresh module per test, so no sheet host leaks between tests.                                      |
| 365 | `lib/toast/index.ts:46`                                               | delete     |                           | Tap-to-dismiss is the toast's only interaction.                                                     |
| 366 | `lib/validation.ts:47`                                                | workaround | type-shape-forcing        | valibot can't prove a generic key is a valid path; `confirm` is a key of                            |
| 367 | `lib/verificationEmail.ts:33`                                         | workaround | swallowed-error           | Resend on verify-email covers a failed send.                                                        |
| 368 | `lib/workoutDetails.ts:207`                                           | domain     |                           | A Strava Activity carries no numbers to show (intervals.icu can't share                             |
| 369 | `lib/workoutDetails.ts:265`                                           | workaround | intervals-api-quirk       | intervals.icu sends null when it hasn't calculated compliance and a                                 |
| 370 | `lib/workoutDetails.ts:297`                                           | workaround | intervals-api-quirk       | A top-level step's duration covers all of its reps, so summing the top                              |
| 371 | `lib/workoutProfile.ts:116`                                           | name       |                           | Once the floors alone would fill the profile, honouring them would force                            |
| 372 | `lib/workoutProfile.ts:196`                                           | name       |                           | A step needs both a length and a power we can place on a %FTP axis. Steps                           |
| 373 | `lib/workoutProfile.ts:227`                                           | name       |                           | Every block would be flat on the floor, leaving the renderer no ceiling to                          |
| 374 | `lib/workoutSteps.ts:99`                                              | name       |                           | A repeat is recognised the same way the Workout Profile unrolls one.                                |
| 375 | `scripts/generate-icons.js:18`                                        | workaround | svg-byte-exact            | Text, because the .icon SVGs commit this spelling byte for byte.                                    |
| 376 | `scripts/generate-icons.js:25`                                        | name       |                           | The Dev build is internal distribution only, so it has no Play listing.                             |
| 377 | `scripts/generate-icons.js:41`                                        | name       |                           | Non-production variants carry a corner ribbon. Dev differs from staging by                          |
| 378 | `scripts/generate-icons.js:63`                                        | name       |                           | Long enough to pass every edge even after the Android layer scales it down.                         |
| 379 | `scripts/generate-icons.js:81`                                        | workaround | platform-icon-rules       | Themed icons drop colour, so a ribboned variant has to differ by shape. The                         |
| 380 | `scripts/generate-icons.js:216`                                       | workaround | jimp-png-header           | rgba(false) writes an RGB header over RGBA data. sips accepts that PNG, but                         |
| 381 | `test-utils/form.ts:18`                                               | workaround | eslint-disable-reason     | eslint-disable-next-line react-hooks/rules-of-hooks -- fixed list                                   |
