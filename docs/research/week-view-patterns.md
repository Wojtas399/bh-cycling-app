# Research: week and agenda views in calendar and training apps

Ticket: #378 (part of wayfinder map #377). Researched 2026-11-13.
This file records how other apps lay out a week or agenda list, then names directions to mock up. The choice belongs to the map.
Month views were covered in #197 ([calendar-layouts.md](https://github.com/Wojtas399/bh-cycling-app/blob/research/calendar-layouts/docs/research/calendar-layouts.md)) and are not repeated here.

Legend:

- **[verified]**: read in a first-party source, or seen in a first-party store screenshot.
- **[community]**: seen in a user's forum post or screenshot. It shows the real product, but only at the date given.
- **[unverified]**: the source was silent or couldn't be read, or this is my inference or memory. Check it before relying on it.

App Store listings were read on 2026-11-13 through the iTunes lookup API (`itunes.apple.com/lookup?id=…`). Sizes are my estimates from 460px-wide screenshots, given relative to the item title text.

## Answer

Every app that makes its days easy to spot does one of two things. It gives the date its **own column** (a left rail with the weekday small above a large number), or it gives the date a **full-width heading row** with nothing else on the line. None of them puts the date inside the day's surface, the way our `CalendarDayTile` does today. None draws a container per day either. Days are separated by whitespace or a single rule, and the items are the only filled shapes. That is the one-level-of-surface rule our map asks for.

Candidate directions (details in [Directions](#candidate-directions-for-bh-cycling)):

1. **Date rail, no day tile** (Google schedule view, TrainerRoad, intervals.icu on a phone). A left column holds the weekday and a large date number; Sheen item cards sit to the right; a hairline separates days. Today gets a filled marker on the number.
2. **Heading rows plus compact rows** (Fantastical, Apple list view). A full-width "PON 10 LIS" style heading row, then week-only compact rows (status dot, title, time, load) drawn flat on the page, with a single Sheen card only for today. Glass sticky headers become possible.
3. **Restyled tile as the control.** Keep one surface per day, but move the date out of it as a bold heading above the tile, and draw items inside as flat rows rather than Sheen cards, so nothing is nested.

## Coverage

| App                 | Week/agenda evidence                                                                             | Confidence                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Google Calendar     | App Store screenshot 1 (schedule view, light), screenshot 6 (dark day view); Google help         | **Good** in light; dark schedule view not seen                                 |
| Fantastical         | App Store screenshots 1 and 3 (dark DayTicker plus list); Flexibits settings help                | **Good**                                                                       |
| Apple Calendar      | Apple's iPhone User Guide (iOS 27) for how to open list view; no screenshot of it in the listing | **Weak** for the visuals; how to reach it is verified                          |
| TrainingPeaks       | App Store screenshot 2 (calendar plus day feed)                                                  | **Fair.** One screen; no dedicated week view seen                              |
| intervals.icu       | Forum threads from 2023 and July 2025, with developer replies                                    | **Community.** The site needs a login; the phone layout wasn't seen first-hand |
| TrainerRoad (extra) | App Store screenshots 3 and 4 (dark calendar list, captioned "March 2021")                       | **Dated** but first-party; closest to our domain and theme                     |

Microsoft Outlook was checked and dropped: none of its nine App Store screenshots shows the calendar. Garmin Connect's listing shows no calendar, as #197 already found.

## Survey

### Google Calendar: schedule view

Sources: [App Store listing](https://apps.apple.com/us/app/google-calendar-get-organized/id909319292), version 26.43.0, screenshots 1, 6 and 8 **[verified]**. [Google help, "Change your calendar view"](https://support.google.com/calendar/answer/6110849?hl=en&co=GENIE.Platform%3DiOS): "To find a list of all your events or tasks by day, choose **Schedule**" **[verified]**.

- **Date header:** a **left rail**, about 15% of the width. The weekday sits on top as small caps (`MON`, `TUE`), at about 60% of the title size, with the date number below at roughly twice the title size (`20`, `21`). The rail is top-aligned with the day's first item. The date never shares a line with an event.
- **Sticky:** in the screenshot the rail label sits at the top of its day group. Whether it sticks while the day scrolls is **[unverified]**. I remember it sticking on Android, but haven't confirmed that.
- **Day separation:** whitespace only, about one item's height between `MON 20` and `TUE 21`. No rule and no tile.
- **Items:** full-colour filled rounded rectangles, full width of the content column. Each shows the title plus a time line, and a third line for location when there is one. Tasks get a check-circle icon. Some events get an illustrated photo background ("Dinner with Gloria", "Flight to Barcelona"). Items are about 6 to 8pt apart.
- **Multi-day spans:** repeated per day, with a counter in the title, for example `Zurich design days (Day 1/2)` on the 20th and `(Day 2/2)` on the 21st. They're placed first in the day, like all-day events.
- **Today:** a **filled blue circle behind the date number**, with the weekday in blue. A **now line** (a dot plus a horizontal rule) is drawn between items at the current time.
- **Home-screen widget (screenshot 8):** the same rail pattern in a smaller space (`MON` / `20` on the left, items on the right). This is evidence that the pattern holds up when compressed.
- **Dark theme:** screenshot 6 shows only the day view in dark (grey all-day band, filled colour chips). How the dark schedule view looks is **[unverified]**.
- **Empty days and week labels:** in my memory, the schedule view skips empty days and inserts week range labels (`10–16 NOV`) and month banners. **[unverified]**: not in the screenshot or the help page.

### Fantastical: DayTicker plus list

Sources: [App Store listing](https://apps.apple.com/us/app/fantastical-calendar/id718043190), version 4.2.4, screenshots 1 and 3 **[verified]**. [Flexibits settings help](https://flexibits.com/fantastical-ios/help/settings) **[verified]**. [Flexibits calendar views help](https://www.flexibits.com/fantastical-ios/help/calendar-views): the DayTicker "is also connected with your schedule below it" **[verified]**.

- **Layout:** a strip of day columns on top (the DayTicker: weekday, big number, coloured pills showing "approximately when in the day each event occurs"), then a continuous list below. In screenshot 1 the DayTicker is light and the list is **black**.
- **Date header in the list:** a **full-width heading row** in small bold caps: `TODAY 9/15/25`, then `TOMORROW 9/16/25`. The weather (`74°/60°` plus an icon) is right-aligned on the same row. The heading text is about the size of an event's time line, so it relies on caps, colour and the rule above it rather than size.
- **Day separation:** a hairline rule plus a slightly lighter band behind the heading row. Events aren't boxed.
- **Items: compact rows, not cards.** A small coloured dot at the left, the time range on the first line, the title on the second line in white, and an optional grey subtitle (`Online`, `Greenhome Courts`). Tasks get a hollow square in place of the dot. Past events are dimmed (`Check email` in grey). A `Join` pill sits right-aligned on a meeting row.
- **All-day items:** a filled colour label at the top of the day (`Book delivery`, `Food markets`), shorter than a row.
- **Multi-day spans:** the settings help has "Show Multi-day Events In All Day Section: Events that span multiple days are displayed alongside all-day events" **[verified]**. So spans appear as all-day labels on each day they cover.
- **Today:** the list heading reads `TODAY` and is **blue**. In the DayTicker, today's number is a filled blue circle and the weekday is red (`MON`).
- **Empty days:** "By default, empty days are omitted from the DayTicker", with a setting to show them **[verified]**. A separate List "Show" setting chooses "all events in the event list, or just the selected day's events" **[verified]**.
- **Sticky headers:** not documented **[unverified]**.

### Apple Calendar: list view

Sources: [Apple iPhone User Guide, "Change how you view events in Calendar on iPhone"](https://support.apple.com/guide/iphone/change-how-you-view-events-iphfd1054569/ios), iOS 27 **[verified]**: "View a list of events for each day: In Month view, tap the Month view icon and choose List … View a complete list of upcoming events: In Day view, tap the Day view icon and choose List." The [App Store listing](https://apps.apple.com/us/app/calendar/id1108185179) (version 2.4) has four screenshots: day, event details, month details and calendars. **None shows list view.**

- **Two list views exist:** one is a month grid with the selected day's list under it, and one is a continuous upcoming list **[verified]**.
- **Date header, day view (screenshot 1):** a full-width heading row, `Monday — Sep 9, 2024`, in semibold text centred under the week strip. Today in the week strip is a **filled red circle** behind the number **[verified]**.
- **Item drawing in day view (screenshot 1):** tinted blocks with a stronger coloured left edge, the title in semibold, and time and location with small icons. Reminders show as hollow-circle rows on a grey pill **[verified]**. This is the day view, not the list view.
- **Continuous list visuals:** from memory, grey full-width section headers with the full date, which stick while scrolling, and then plain rows with the time in a left column and a coloured dot. **[unverified]**: I found no first-party image.

### TrainingPeaks: calendar plus day feed

Sources: [App Store listing](https://apps.apple.com/us/app/trainingpeaks-plan-train-lift/id408047715), version 12.118.1, screenshot 2 **[verified]**. [Help article on adding workouts in the mobile app](https://help.trainingpeaks.com/hc/en-us/articles/360054734312) mentions "the small '+' on that day" **[unverified]**: read only in a search excerpt.

- **No dedicated week view was seen.** The phone calendar is a compact month with a scrolling day feed under it. I found no first-party help page for a week view.
- **Date header in the feed:** a plain text row, `Tomorrow • Mar 11, 2026`, in regular weight at about the title size, on the light-grey page background. It is a heading row, not a rail.
- **Day separation:** a full-bleed band change. The heading row sits on the grey page, and the day's items sit on white below it.
- **Items: full-width cards with a status strip.** A green left edge (a completed, on-plan workout), the title, a sport icon, three big numbers (`1:21:58`, `15.1mi`, `91TSS ✓`), a grey workout-profile skyline across the card, then a footer row (sport label, medal, feeling and comments counts). The status strip carries the compliance colour from the [athlete guide](https://www.trainingpeaks.com/learn/trainingpeaks-athlete-user-guide/) (see #197).
- **Today:** a blue rounded-square outline on the grid cell. Whether that marks today or the selection is **[unverified]**, as in #197. The feed calls tomorrow `Tomorrow`, which suggests relative labels near today.
- **Multi-day spans:** not seen.

### intervals.icu: the website on a phone

Sources: forum threads only; the site needs a login. Earlier evidence (one day per row on narrow screens, date stacked at the left as `Sun / 27 / Jul`, a week header row with totals) is in #197's file and isn't repeated here.

- **Date header, 2023:** "Day and date on the phone is very clear and prominently displayed in a dedicated 'box' on the left of the screen" (user nasatt, 8 March 2023, [Calendar Design Tweaks](https://forum.intervals.icu/t/calendar-design-tweaks/33229)) **[community]**. That is a rail. The same user found that on a laptop, where the date sits inside the day cell, "it's very difficult to identify the day you want when the calendar is full of completed workouts". This is the same complaint our map makes.
- **July 2025 refresh** ([Calendar and week info update](https://forum.intervals.icu/t/calendar-and-week-info-update/109142), Eva, 18 July 2025: "We also took this opportunity to tackle some issues with the mobile view") **[community]**:
  - Users asked for the date to sit at the top of every day, including empty ones, and Eva put "See if we can always get the dates on the top of the day" on the to-do list (20 July).
  - **Today:** the refresh marked today with a larger font. Users pushed back: "Today's date is harder to identify quickly without its previous solid border highlight" (Joao); "Bold date, and a black frame around it with white background" was preferred (R2Tom). One user preferred bold over size, and another was happy with size (Gerald, David_R). **Lesson: size alone wasn't a strong enough today marker; a filled or framed shape was.**
  - **Week header:** "The week header consumes significantly more vertical space—nearly double the previous version" (Joao). Eva planned to make it "less tall".
  - Past activities "look too big" on mobile, which was a chart-width bug that was later fixed.
- **Items:** cards with a coloured header strip and a workout skyline chart (#197). "Planned workouts have a accompanying chart. so thats how I differentiate" (app4g, 2023) **[community]**.
- **Multi-day spans:** not discussed in either thread.

### TrainerRoad (extra): dark calendar list

Sources: [App Store listing](https://apps.apple.com/us/app/trainerroad/id934224107), version 2026.44.0, screenshots 3 and 4 **[verified]**. The screenshots show "March 2021" and "Nov 2021", and an old-style iOS status bar, so **the current app may differ**.

This is included because it is the closest match to our app: a dark theme, cycling workouts with a profile chart, and a vertical week list.

- **Date header:** a **left rail**, about 13% of the width. The weekday is small grey text (`Thu`) and the date number is white, at about 1.5 times the title size (`4`). The number has a regular weight, not bold.
- **Today:** a **red vertical bar** on the far left edge of the rail, next to `Thu 4`. The day's card is otherwise unchanged.
- **Week header:** a full-width row above the days, `Week 10`, with `3:27 / 6:45 HOURS` and `258 / 425 TSS` (done over planned) on the right. It sits on a slightly lighter band with rules above and below.
- **Day separation:** whitespace, about 16pt. No tiles or rules between days.
- **Items:** one **card per workout**, dark grey with a 1px lighter border. A workout card has a large blue workout-profile chart on top, then the name (`Fang Mountain +1`), type and level (`Threshold 4.4`), three metrics with small caps labels (`01:15:00 DURATION`, `93 TSS`, `0.86 IF`), a status badge (`P Productive`) and, on today only, a full-width red `Load Workout` button. Other days get a **compact card**: a small profile thumbnail on the left with the name, level and the same three metrics on the right (`Pettit`, `Endurance 3.0`).
- **So today is promoted twice:** by the red rail bar and by being the only full-size card. The rest of the week uses compact cards.
- **Multi-day spans:** not seen.

## Cross-app patterns

| Concern           | Google schedule                             | Fantastical                      | Apple list                     | TrainingPeaks                | intervals.icu (phone)              | TrainerRoad                            |
| ----------------- | ------------------------------------------- | -------------------------------- | ------------------------------ | ---------------------------- | ---------------------------------- | -------------------------------------- |
| Date position     | Left rail                                   | Heading row                      | Heading row [unv.]             | Heading row                  | Left rail / top (2025)             | Left rail                              |
| Number vs weekday | Big number, small weekday                   | Relative word plus short date    | Full date text                 | Relative word plus date      | Stacked weekday, number, month     | Big number, small weekday              |
| Day separation    | Whitespace                                  | Rule plus a lighter heading band | Header band [unv.]             | Band change (grey to white)  | Light divider                      | Whitespace                             |
| Item drawing      | Full-colour filled cards                    | Compact rows (dot, time, title)  | Rows with dot [unv.]           | Full cards with status strip | Cards with header strip            | Cards, today large, others compact     |
| Container per day | None                                        | None                             | None                           | None                         | Row only                           | None                                   |
| Multi-day span    | Repeated per day, `(Day 1/2)`               | All-day label on each day        | not seen                       | not seen                     | not seen                           | not seen                               |
| Today marker      | Filled circle on the number plus a now line | `TODAY` label in blue            | Filled red circle (week strip) | Outline on the grid cell     | Bigger font (users wanted a frame) | Red bar on the rail plus a bigger card |

What this suggests for us:

1. **The date needs its own column or its own line.** Ours shares the tile with Notes and items, at body-s size, so it loses. Every app above gives it either a rail or a heading row. The rail apps (Google, TrainerRoad) make the **number large** and the **weekday small**.
2. **No app wraps a day in a box and then puts boxed items inside it.** Days are separated by whitespace, a rule or a band. The items are the only filled shapes. That matches our "no Sheen-in-Sheen" rule: if items stay Sheen cards, the day tile has to go or go flat and borderless.
3. **The today marker is a filled shape, not a colour or size change.** Google and Apple use a filled circle, TrainerRoad a solid bar, and intervals.icu users rejected "just bigger". Our accent-coloured text alone matches what the intervals.icu users complained about.
4. **Multi-day spans** are shown either repeated on each day with a position counter (Google) or as all-day labels per day (Fantastical). Neither app uses a vertical bar running down a column, which is what our Note stripes are closest to. Our week-long Note banners above the list have no direct equivalent among these apps; Google's month banners and TrainerRoad's week header row are the nearest, since both sit above the days.
5. **Training apps promote today or the selected day.** TrainerRoad gives today the full card and gives other days compact cards. TrainingPeaks shows the selected day's full card under the grid. A compact week-only row with a full card for today follows this precedent.

## Candidate directions for bh-cycling

All three keep the binding rules from map #377: dark, current tokens and Inter, Monday first, Polish labels, no swipe, Notes visible, Workout Status colours unchanged, a strong today marker, and no weekend treatment.

### 1. Date rail, no day tile

- **Header:** a left rail about 48 to 56pt wide. The weekday is in small caps (`PON`, `WT`) in `textSecondary`, with the date number about 2 times the body size in semibold white. The rail is top-aligned with the day's first item.
- **Day surface:** none. Days are separated by a 1px hairline rule across the content column (or whitespace only, to compare), so the page stays black.
- **Items:** `CalendarItemTile` stays as the Sheen card, which is now the only surface. There is no nesting.
- **Today:** a filled marker behind the number (a white or accent circle with dark text) and the weekday in accent, like Google. Optionally add a short vertical bar on the rail, like TrainerRoad.
- **Empty days:** the rail with `Odpoczynek` or a dash in the content column, so all seven days stay visible.
- **Notes:** a multi-day Note becomes a thin coloured line down the rail's inner edge, spanning the days it covers. This is the clearest visual for a span, because the rail is continuous. Single-day chips sit above the day's items, on the page with no surface. Week-long Notes keep their banners above the list.
- **Risk:** Sheen cards stacked down a long column may still feel heavy. Mock it with real cards on a busy week.

### 2. Heading rows plus compact rows

- **Header:** a full-width heading row per day, `Poniedziałek, 10 listopada`, or `DZIŚ · 13 LIS` for today, in medium weight with a hairline above. As an option, the row is a Glass sticky header that the day's content scrolls under, matching the Calendar's chrome layer from #330 (Glass is chrome and Sheen is content, so this keeps the layers apart).
- **Day surface:** none.
- **Items:** a week-only compact row, drawn flat on the page with no card. From left: a Workout Status dot or short bar, the title, then duration and load right-aligned, in one or two lines. Race and Unplanned Activity variants reuse the same row with their own leading marker. **Today's items only** use the full Sheen `CalendarItemTile`, the way TrainerRoad does.
- **Today:** the heading reads `DZIŚ`, in white on a filled pill or with an accent bar. Today's full Sheen cards strengthen it further.
- **Notes:** a multi-day Note shows as a small coloured label at the top of each day it covers, with an `(1/3)` counter as Google does. Banners stay for week-long Notes.
- **Risk:** this introduces a second item style (the map allows one, week-only). It is the densest option and the farthest from today's look.

### 3. Restyled tile as the control

- **Header:** the date moves **out** of the tile into a bold heading line just above it (weekday plus number, at about 1.5 times the body size), so it no longer competes with the content.
- **Day surface:** one flat tile per day, with no gradient and only a faint fill and hairline (the #330 rule for day tiles stays).
- **Items:** flat rows inside the tile, not Sheen cards, so there is one surface level. Rows use the compact layout from direction 2.
- **Today:** the tile gets a brighter hairline or an accent edge, and the heading gets a filled marker.
- **Notes:** chips sit inside the tile's top edge, and stripes become a tile edge colour.
- **Why include it:** it is the smallest change from today's code and the fair baseline for judging 1 and 2.

### What the mockups should test

- A busy week (two items on some days, a Race, a multi-day Note and a week-long Note) and an empty-ish week.
- Today in the middle of the week, so its marker has to stand out against days on both sides.
- Whether a Glass sticky heading (direction 2) reads as chrome or as clutter under the Calendar's existing Glass header.
- A rail Note line (direction 1) against the current stripes, for spans that cross a day with no items.

## Sources

- Google Calendar App Store listing: https://apps.apple.com/us/app/google-calendar-get-organized/id909319292
- Google Calendar help, views: https://support.google.com/calendar/answer/6110849?hl=en&co=GENIE.Platform%3DiOS
- Fantastical App Store listing: https://apps.apple.com/us/app/fantastical-calendar/id718043190
- Fantastical help, settings: https://flexibits.com/fantastical-ios/help/settings
- Fantastical help, calendar views: https://www.flexibits.com/fantastical-ios/help/calendar-views
- Apple iPhone User Guide, change how you view events: https://support.apple.com/guide/iphone/change-how-you-view-events-iphfd1054569/ios
- Apple Calendar App Store listing: https://apps.apple.com/us/app/calendar/id1108185179
- TrainingPeaks App Store listing: https://apps.apple.com/us/app/trainingpeaks-plan-train-lift/id408047715
- TrainingPeaks athlete guide: https://www.trainingpeaks.com/learn/trainingpeaks-athlete-user-guide/
- intervals.icu forum, Calendar Design Tweaks (2023): https://forum.intervals.icu/t/calendar-design-tweaks/33229
- intervals.icu forum, Calendar and week info update (July 2025): https://forum.intervals.icu/t/calendar-and-week-info-update/109142
- TrainerRoad App Store listing: https://apps.apple.com/us/app/trainerroad/id934224107
- Microsoft Outlook App Store listing (checked, no calendar screenshot): https://apps.apple.com/us/app/microsoft-outlook/id951937596
