# Research: how phone calendars fill the screen and separate days

Ticket: #197 (part of wayfinder map #196). Researched 2026-10-30.
This file records what the apps do, then names the patterns to mock up. The layout decision belongs to the map.

Legend:

- **[verified]**: read in a first-party source, or seen in a first-party store screenshot.
- **[community]**: seen in a user's real screenshot or forum post. It shows the real app, but only at the date given.
- **[unverified]**: the source was silent, could not be read, or this is my inference. Check before relying on it.

Proportions are my measurements from screenshots, as a share of the visible screen. Point values assume the device size in brackets. Treat them as accurate to within a few percent. App Store listings were read on 2026-10-30 through the iTunes lookup API.

## Answer

1. **Filled tile grid (Garmin Connect).** Every day is a lighter tile on a darker background, with a thin gap. The grid fills the screen down to the tab bar.
2. **Compact month plus inline day panel (Fantastical, TrainingPeaks).** Rows stay short, and the selected day's items fill the rest of the screen, replacing the bottom sheet.
3. **Week rules with stretched rows (Apple Calendar).** A full-width hairline sits above each week, with no vertical lines. Rows stretch to about 16% of the screen.

Details and numbers are in [Recommended patterns](#recommended-patterns-for-bh-cycling).

## Coverage: what could and could not be confirmed

| App             | Month view evidence                                                                                               | Confidence                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TrainingPeaks   | First-party App Store screenshot, app 12.117.0, shows March 2026                                                  | **Good**, for one screen only                                     |
| Google Calendar | First-party App Store screenshot, app 26.41.0; Google help pages                                                  | **Good** for the light theme. Dark month view not seen            |
| Garmin Connect  | User screenshots from June 2019 (iOS) and August 2021 (Android). The eight App Store screenshots show no calendar | **Dated.** Current design unverified                              |
| intervals.icu   | User screenshots from July 2025 (beta site); forum posts by the developers                                        | **Fair.** No official phone app found; it is a responsive website |
| Apple Fitness   | Apple's guide confirms a date picker. No screenshot shows it                                                      | **Weak.** Grid layout not confirmed                               |

Two apps outside the ticket's list are included because they are the closest match to the problem:

| App            | Evidence                                                                             | Why it is here                                      |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Fantastical    | First-party App Store screenshots, September 2025; Flexibits help                    | The only confirmed dark month grid with dot markers |
| Apple Calendar | First-party App Store screenshots, September 2024 (iOS 18 era); Apple's iOS 27 guide | A clear week-separation pattern                     |

Samsung Calendar was dropped: only forum posts turned up, with no first-party source. TrainerRoad's listing shows no month grid.

## Survey

### TrainingPeaks (iOS)

Source: [App Store listing, screenshot 2](https://apps.apple.com/us/app/trainingpeaks-plan-train-lift/id408047715). All points below are **[verified]** from that screenshot unless marked.

- **Vertical space:** a compact month on top, content below. The month block takes about 31% of the screen (18% to 49%). Below it sit Performance Metrics, the day's workout card, and a "Tomorrow" section, which reads as a continuing day feed. A `Calendar / Charts / Hide` control sits above the grid.
- **Rows:** four weeks are visible (9 March to 5 April), with `MARCH 2026` above. Row pitch is about 6.3% of the screen, about 60pt [440×956], and cells are almost square. Why only four rows show is [unverified]. It may be a rolling window from the current week.
- **Separation:** none. There are no lines, tints or gaps between days; numbers float on the background.
- **Day cell:** a number, a small dot row beneath it, and sometimes a grey circle behind the number. Circles differ in size, and the screenshot does not explain why. Some days have a red corner triangle, also unexplained. Do not copy either without knowing their meaning.
- **Selected or current day:** a blue rounded-square outline around the whole cell (Tuesday the 10th, with the feed below showing "Tomorrow • Mar 11"). Whether this marks today, the selection, or both is [unverified].
- **Detail:** inline, under the grid, as a workout card with a coloured left edge.
- **Several items:** two dots in a row, in different colours when mixed. Three or more was not shown.
- **Status colour:** TrainingPeaks' [athlete guide](https://www.trainingpeaks.com/learn/trainingpeaks-athlete-user-guide/) defines compliance colours: green within ±20% of plan, yellow, orange, red for not completed, grey for unplanned **[verified]**. Their [help centre](https://help.trainingpeaks.com/hc/en-us/articles/204861204) says the mobile app shows this as a strip on the left of the card. I read that only in a search excerpt, because the page returned 403 to a direct fetch **[unverified]**. It matches the green edge in the screenshot.

### Google Calendar (iOS, Android)

Sources: [App Store listing, screenshot 5](https://apps.apple.com/us/app/google-calendar-get-organized/id909319292) **[verified]**, [view help](https://support.google.com/calendar/answer/6110849?hl=en&co=GENIE.Platform%3DAndroid) **[verified]**.

- **Vertical space:** the grid fills everything under the header. Six rows run from about 12% of the screen to the bottom edge, about 82% in total.
- **Rows:** pitch is about 13.7% of the screen, about 123pt [414×896]. Cells are about 59pt wide, so roughly 1:2 tall.
- **Separation:** hairlines in both directions, a full ruled table.
- **Day cell:** the number top-centre, then full-colour text chips truncated to the cell width. Grey numbers mark neighbouring months.
- **Today:** a filled blue circle behind the number.
- **Detail:** the [2015 announcement](https://workspaceupdates.googleblog.com/2015/04/month-view-added-to-google-calendar-app_8.html) says you "tap on a specific day for a closer look" **[verified]**, and the [screen-reader guide](https://support.google.com/calendar/answer/6101541?hl=en&co=GENIE.Platform%3DAndroid) describes opening the focused day **[verified]**. Exactly what appears on tap today is [unverified].
- **Several items:** three chips, then `•••` on a line of its own. Multi-day events run as one bar across cells.
- **Month navigation:** swipe, which is ruled out for us.
- **Dark theme:** the listing shows dark mode only in day view. Dark month separators are [unverified].

### Garmin Connect (iOS, Android)

Sources: [June 2019 iOS screenshot](https://forums.garmin.com/de/apps-und-software/mobile-apps-web/f/garmin-connect-mobile-ios/166327/calendar-month-view) and [August 2021 Android screenshot](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-andriod/278919/colours-of-activities-in-calendar) **[community]**. The [App Store listing](https://apps.apple.com/us/app/garmin-connect/id583446403) (5.30.1) shows no calendar, and I found no Garmin help page on it. **The current design is [unverified].**

- **Vertical space:** the grid fills everything between the header and the tab bar, about 77% of the screen on iOS 2019 (rows about 12.6%) and 67% on Android 2021 (rows about 11%, with more phone chrome). Both show six rows.
- **Separation:** filled tiles. Each day is a dark grey tile on a black background with a thin black gap. No lines are drawn.
- **Neighbouring months:** darker tiles with dim numbers, so the current month stands out as a lighter block.
- **Day cell:** the number top-left, then full-width horizontal bars, stacked. Bars carry no text.
- **Selected or current day:** a blue outline around the tile in the 2019 shot (the 29th). Whether this is today or the selection cannot be told from the image.
- **Several items:** bars stack to about three or four, then a blue `+N` at the bottom right. A forum reply says the number means items that do not fit, and that tapping it "will show the day in full view". Another reply reports all activities are green with no way to change it.
- **Meaning by colour:** a forum reply reads blue as steps (solid when the goal is met, broken when not), green as activity and violet as sleep **[community]**.
- **Month navigation:** chevrons either side of the month on iOS 2019, and a month tab strip on Android 2021. Chevrons fit our no-swipe rule.
- **Weak spot:** empty days are large blank tiles. On a quiet month, the grid is mostly empty tiles.

### intervals.icu (phone browser)

Sources: [Developer reply (user `david`), February 2021](https://forum.intervals.icu/t/2993): "Intervals.icu does work on a phone sized screen" **[verified]**. [July 2025 refresh thread with phone screenshots](https://forum.intervals.icu/t/calendar-and-week-info-update/109142) **[community]**. [Forum post, 2025](https://forum.intervals.icu/t/notes-or-names-on-week/52883) on the narrow layout **[community]**.

- **Phone layout:** not a month grid. A [user post](https://forum.intervals.icu/t/notes-or-names-on-week/52883) says that on a narrow screen "the calendar view switches to one day per row". The July 2025 screenshots agree: a vertical list with the date stacked at the left (`Sun / 27 / Jul`) and a card to the right.
- **Separation:** a light divider between day rows.
- **Week summary:** a header row per week, with week number, date range, total time, load, fitness, fatigue, form and ramp.
- **Day contents:** a card with a coloured header strip for sport, duration and distance, then load. Red tones mark a race in the screenshots; the exact rule is [unverified].
- **Several items:** cards stack in the day row.
- **Wide screen, for reference:** seven day columns plus a left week-summary column. Empty days show a large centred date. A missed planned workout shows a red cross with `0%`. A user screenshot shows this, but it is a desktop layout.
- **Official app:** none found. Forum threads point to third-party apps, and [Intervals.icu Companion](https://apps.apple.com/us/app/intervals-icu-companion/id6739638454) is a third-party app by McEwen Labs. Its screenshots show a list of workouts by day, not a month grid.
- The phone's current layout was not checked first-hand. The site needs a login.

### Apple Fitness (iPhone)

Sources: [Apple's guide](https://support.apple.com/en-ca/guide/iphone/iph4c34a8a95/ios) **[verified]**, [App Store listing](https://apps.apple.com/us/app/apple-fitness/id1208224953) **[verified]**.

- Fitness has no calendar tab in the listing. The tabs shown are Summary, Fitness+, Workout and Sharing.
- The guide's route to a past day is: tap Summary, tap the Activity rings, tap the calendar icon, tap a date. So the calendar is a picker for reaching one day, not a main screen.
- **Whether that picker shows rings per day, and everything else about its layout, is [unverified].** No Apple page or store screenshot shows it. This app adds nothing usable for a month grid.

### Fantastical (iPhone), extra

Sources: [App Store listing, screenshots 3 and 8](https://apps.apple.com/us/app/fantastical-calendar/id718043190) **[verified]**, [calendar views help](https://www.flexibits.com/fantastical-ios/help/calendar-views) **[verified]**.

- **Vertical space:** a compact month, a drag handle, then the agenda. Title and grid end at about 40% of the screen. The agenda takes the rest.
- **Rows:** six rows at about 4% each, about 36pt [414×896]. Cells are wider than tall. That height is under Apple's commonly cited 44pt tap target [unverified: the HIG page could not be read].
- **Separation in the compact month:** nothing between days. A **lighter rounded band across the selected week** is the only structure, and it is effective on black.
- **Day cell:** number, then tiny coloured dots, about four at most. The dots show event counts by colour, per Flexibits' help.
- **Selected day:** a filled blue circle behind the number, inside the week band.
- **Detail:** the agenda under the grid updates in step, with day headings `TODAY 9/15/25` and `TOMORROW 9/16/25`.
- **Full month view:** a separate option, shown in light mode. It has hairlines both ways, a tinted column for today, a stepped line and a `Sep 1` / `Oct 1` pill at month boundaries, dot-prefixed event titles, and `2 more…` overflow.
- **Year view, dark:** each day is a tile tinted by how busy it is, with thin gaps. Evidence that tinted tiles read well on black.
- **Month navigation:** swipe, ruled out for us.

### Apple Calendar (iPhone), extra

Sources: [App Store listing, "Complete views" screenshot](https://apps.apple.com/us/app/calendar/id1108185179) **[verified]**, [Apple's guide, iOS 27](https://support.apple.com/en-ca/guide/iphone/iphfd1054569/ios) **[verified]**.

- **Vertical space:** in Details mode the grid runs from about 20% of the screen to the tab bar, about 70%. Row pitch is about 16%, about 138pt [393×852], so about 4.5 weeks show at once and the view scrolls.
- **Separation:** one full-width hairline above each week and no vertical lines. In a short final week, the line stops at the last day of the month.
- **Weekends:** dim grey numbers, which gives a quiet column rhythm.
- **Today:** a filled red circle behind the number.
- **Several items:** title pills, then a small grey `+N` on the last line.
- **Density modes** (exact wording from the guide): Compact shows "a single bar indicator for the events on each day", Stacked shows "a bar indicator for each event", Details shows "event titles", and List means "Tap each day to see a list of events".
- Compact, Stacked and List screens were not seen, so their look is [unverified].

## Comparison

|                    | Month's share of screen | Rows visible | Row height          | Day separation          | Selected or today         | Overflow                         |
| ------------------ | ----------------------- | ------------ | ------------------- | ----------------------- | ------------------------- | -------------------------------- |
| TrainingPeaks      | ~31%                    | 4            | ~60pt               | None                    | Blue outlined square      | 2 dots seen; beyond that unknown |
| Google Calendar    | ~82%                    | 6            | ~123pt              | Hairlines both ways     | Filled circle (today)     | `•••` after 3 chips              |
| Garmin (2019/2021) | ~67–77%                 | 6            | ~11–12.6% of screen | Tiles with gaps         | Blue outlined tile        | `+N`, bottom right               |
| intervals.icu      | n/a, a list             | n/a          | n/a                 | Row dividers            | Not established           | Cards stack                      |
| Apple Fitness      | Unknown                 | Unknown      | Unknown             | Unknown                 | Unknown                   | Unknown                          |
| Fantastical        | ~40%                    | 6            | ~36pt               | Selected-week band only | Filled circle + week band | ~4 dots                          |
| Apple Calendar     | ~70%, scrolls           | ~4.5         | ~138pt              | Week hairlines only     | Filled circle (today)     | `+N`                             |

## What this says about our two problems

- **Filling the screen:** every app does one of two things. It stretches rows to the tab bar (Garmin, Google, Apple) or it keeps rows short and uses the rest for the selected day (TrainingPeaks, Fantastical). None of the confirmed apps leaves the area below the grid empty.
- **Separating days:** tiles, lines and bands all work. Floating numbers alone only work in short rows with a strong selection marker, as in TrainingPeaks and Fantastical. Stretched rows always carry a structure, because tall cells with no edges would not read as cells.

## Project baseline (origin/main, 49abb65)

- `CalendarMonthGrid.tsx`: `CELL_MIN_HEIGHT` 52, `DAY_NUMBER_SIZE` 32, `MARKER_SIZE` 6, Note bars `BAR_HEIGHT` 14 in two lanes with a `+N`. Bars are drawn over the cells in one layer, so a multi-day Note runs unbroken.
- Today is a filled white circle (`interactiveDefault`). Neighbouring days are dimmed, not tappable and have no data.
- Header: toggle and refresh row, then chevrons and title with `base` (16) margin above and below. Month navigation is already chevrons.
- Tokens: `bgPrimary` #0A0A0A, `bgSecondary` #121212, `bgTertiary` #1C1C1E, `borderDefault` #2C2C2E, `borderStrong` #3A3A3C.

**Space estimate [unverified]** for a 390×844 phone. I assumed about 47pt top inset, 83pt tab bar, and about 124pt for our header plus weekday row. That leaves **about 590pt for the grid**. Measure this in the prototype.

## Recommended patterns for BH Cycling

The numbers below are starting values for the mockups, derived from the estimate above. They are not measured from any app. All three keep the Note bars, the dots and rings, and the chevrons.

### 1. Filled tile grid (from Garmin)

Best direct fix for both stated problems, and the smallest structural change: the sheet stays as it is.

- **Proportions:** rows share the height equally. About 98pt with 6 rows and about 118pt with 5. The grid runs full-bleed, about 54pt tile width with 2pt gaps.
- **Separators:** `bgTertiary` tiles on `bgPrimary`, `sm` (4) radius, 2pt gap. Neighbouring-month cells get no tile, so the month reads as a solid block. `bgTertiary` on `bgPrimary` is only about 1.2:1 contrast by my calculation, so also mock `borderDefault` (about 1.4:1).
- **Cell:** number top-left (Garmin) or top-centre (ours). Then Note bars, then markers along the bottom of the tile. Raise `MARKER_SIZE` to about 8, because tall tiles make 6pt dots look lost.
- **Selected day:** a `textPrimary` 1.5pt outline around the tile, kept separate from today's filled circle. Our sheet opens on tap, so this only shows while the sheet is up.
- **Multi-item days:** dots wrap. After about 4 markers, show `+N`. Empty tiles are the known weakness, so check a quiet month in the mock.
- **Watch:** a Note bar has to cross the 2pt gaps. It already draws in its own layer, so this should work unchanged [unverified].
- **Watch:** 5 and 6 week months change row height between months, unless rows stay fixed at the 6-week height.

### 2. Compact month plus inline day panel (from Fantastical and TrainingPeaks)

Best use of the space, because it shows real content rather than bigger empty cells. It also answers two open map questions: the day sheet would go, and the week view may become redundant.

- **Proportions:** keep rows at about 52pt, which clears the 44pt target that Fantastical's 36pt rows miss. Six rows take about 312pt, leaving about 278pt for the panel. Whether the panel scrolls alone or with the grid is a mockup question.
- **Separators:** a `bgSecondary` band across the selected week (Fantastical), with `borderDefault` hairlines above other weeks if days still run together.
- **Cell:** as today: number, Note bars, markers. 52pt is a minimum: a day number (32pt) plus two Note lanes (14pt each) already exceeds it, so weeks with Notes grow and the panel shrinks. Check a Note-heavy month in the mock.
- **Selected day:** a `textPrimary` outline square (TrainingPeaks), or an outline ring around the number. Today stays the filled circle. Default selection is today. Selecting a day updates the panel, with no sheet.
- **Panel contents:** a day heading, then `CalendarItemTile`s with status as a left edge strip, which is TrainingPeaks' mobile treatment of compliance. This keeps the Workout Status colour meaning.
- **Multi-item days:** the panel lists everything, so the grid needs no overflow rule beyond what Notes already have. An empty day needs an empty state.
- **Watch:** the panel appears only once the month has loaded and needs loading and error states of its own. Fantastical's drag handle is not needed.

### 3. Week rules with stretched rows (from Apple Calendar)

The lightest option, and the control for the mockups. It suits the plain dark look, but it separates weeks more than it separates days.

- **Proportions:** the same stretched rows as pattern 1, about 98–118pt. Inset grid is fine; full-bleed is not needed.
- **Separators:** a `borderDefault` hairline above each week, and none between columns. It stops at the last day of the month, as Apple's does. Dim weekend numbers to `textSecondary` for column rhythm.
- **Cell:** number top-centre, then Note bars and markers directly below it, so empty space collects at the bottom of the row.
- **Selected day:** the same outline as pattern 1, or a `bgSecondary` cell tint.
- **Multi-item days:** as pattern 1, `+N` after about 4 markers.
- **Watch:** days within a week have no edge. If "days run into each other" remains after the mock, this one is out. Stacked bars instead of dots (Garmin, Apple's Stacked mode) would read better in tall cells, but cannot be a straight swap, since bars here already mean Notes.

### Details worth reusing in any pattern

- Keep today and selection visually distinct: filled for today, outline for selected.
- Use the shared overflow style: a small `+N` in `textSecondary`.
- Keep chevrons. Google and Fantastical rely on month swiping, so their navigation does not transfer.
- For the open **weekly totals** question, TrainingPeaks' Home View has a weekly snapshot of planned versus completed values, and intervals.icu has a header row per week. A totals row inside a month grid was only seen on desktop-width intervals.icu. Pattern 2's panel is the natural home for it.

### Rejected

- **Text chips (Google, Apple Details):** they need titles at about 55pt width, which truncate to a word or less, and would compete with Note bars.
- **One day per row (intervals.icu):** it is a list, close to our week view, and gives up the month overview.
- **Density tint (Fantastical year view):** Workout Status colours already carry meaning, so a load tint would need its own decision.
