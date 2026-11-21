# BH Cycling

A cycling training app backed by Intervals.icu. Dark mode only, Polish UI labels.

## Language

**Workout**:
A training session planned on the athlete's Intervals.icu calendar, with a date and, usually, a structure of steps. It is the plan, not the ride itself.
_Avoid_: Event, session, training

**Cycling Workout**:
A Workout whose type is a ride type: `Ride`, `VirtualRide`, `GravelRide`, `MountainBikeRide`, `EBikeRide`, `EMountainBikeRide`, `TrackRide`, `Velomobile` or `Handcycle`. Only a Cycling Workout's steps describe the session, so only it has a Workout Profile, steps and planned work. Any other Workout, such as a strength session, is non-cycling: its description is its content, shown in full as Note Markdown, and it has no Workout Profile.
_Avoid_: Notes-first workout, strength workout (as the general term)

**Activity**:
A session the athlete actually recorded on Intervals.icu, of any sport: a ride, a run, a strength session. An Activity that fulfils a Workout is paired to it; the athlete sets the pairing on Intervals.icu, and it counts whichever side records it. The two show as one item on the Activity's day — even when the Workout was planned for another day — as on Intervals.icu.
_Avoid_: Ride, completed workout

**Unplanned Activity**:
An Activity not paired to any Workout, e.g. a spontaneous Zwift ride. It shows on its own day alongside that day's Workouts. It has no Workout Status: status describes a plan, and there is none.
_Avoid_: Free ride (a kind of planned Workout), extra workout, unpaired ride

**Strava Activity**:
An Activity intervals.icu received from Strava but can't share through its API, so only its id and start time are known. It has no details. Unless it is paired to a Workout, it's an Unplanned Activity.
_Avoid_: Stub, hidden activity

**Workout Details**:
The screen for one Workout, pushed over the tabs from any Workout tile. A completed Workout also shows what its paired Activity recorded, including that Activity's Route when it has one. A planned or missed Workout has no Activity, so it has no Route.
_Avoid_: Workout sheet, workout page

**Activity Details**:
The screen for one Activity with no Workout behind it: an Unplanned Activity, or an Activity paired to a Race, which opens with that Race named on top. It's a sibling of Workout Details, not one of its modes.
_Avoid_: Unpaired workout details, activity mode

**Note Details**:
The screen for one Note: its title, colour and dates, then its text as Note Markdown. A sibling of Workout Details and Activity Details, pushed from a Note's card on Home, the Calendar and the Calendar day sheet. It replaced the Note sheet, so a Note never opens in a sheet.
_Avoid_: Note view, note page, Note sheet, Note Detail Sheet

**Workout Profile**:
The planned shape of a Cycling Workout's effort, drawn from its steps: a block for each step ridden, every rep of a Repeat included, as wide as its share of the Workout's time and as tall as its Power Target in %FTP, coloured by Power Zone. A step with a power range is solid up to its floor, the power the athlete is asked to hold, and faint up to its ceiling. A Ramp is a slope. When the steps it can draw cover less than half the Workout's time, there is no Workout Profile, and the Workout shows its title and duration alone.
_Avoid_: Workout graph, workout chart, Activity Profile, which is the recorded shape

**Activity Profile**:
The recorded shape of an Activity's effort, drawn from intervals.icu's detected intervals and coloured by power zone. Shown on Activity Details, and on a completed Workout's Workout Details below its Workout Profile, the two on one time scale.
_Avoid_: Workout Profile, which is the planned shape

**Time in Zone**:
How long a session spends in each power zone, Z1 to Z7, listed under the large profile card. The plan's time comes from the Workout's steps. The ride's time comes from intervals.icu's zone times, so the two apps agree, or from the Activity Profile when intervals.icu has none.
_Avoid_: Zone distribution, zone breakdown

**Scrub Readout**:
The panel that drag-to-inspect opens on the large profile card. It shows the time under the pointer, and the zone, %FTP and watts of each strip at that moment. It stays after the finger lifts until the athlete hides it.
_Avoid_: Tooltip, crosshair

**Ramp**:
A step whose power climbs or falls steadily from a start power to an end power. A Workout Profile draws it as a slope from start to end in the order it's ridden, the Scrub Readout reads its power along that slope, and it's coloured by the zone at its midpoint.
_Avoid_: Range, which holds one band of power throughout

**Power Target**:
The power a Workout step asks for: a %FTP value, a %FTP range, a Ramp, or a whole Power Zone. A step with no %FTP reading, such as one targeted by heart rate, has no place in the Workout Profile.
_Avoid_: Target power, intensity target

**Repeat**:
A run of Workout steps ridden a number of times in a row, such as 6 × (3 min on, 2 min off). Its length is the total of all its reps. The step list keeps it nested; the Workout Profile draws every rep.
_Avoid_: Loop, set

**Workout Doc**:
Intervals.icu's parse of a Workout's plan into ordered steps, each with a length and its power, heart-rate or cadence targets, a Repeat arriving as one step with its reps and the steps of a single rep. Only a Cycling Workout's Workout Doc describes the session: on any other Workout the parser has taken lines of the plan for steps, so they mean nothing.
_Avoid_: Step parse, workout structure

**FTP**:
The athlete's functional threshold power, in watts, from their Ride settings on Intervals.icu. Power zones and %FTP targets are fractions of it. A Workout's planned watts come from the current FTP; an Activity carries the FTP Intervals.icu used when it was ridden, and its recorded watts come from that one.
_Avoid_: Threshold (alone)

**Power Zone**:
One of Z1 to Z7: a band of %FTP above the ceiling of the zone below, up to and including its own. The athlete's ceilings come from their Ride settings on Intervals.icu, or are Coggan's when they have no usable ones: 55, 75, 90, 105, 120, 150 and 200% FTP. Sweet Spot overlaps Z3 and Z4, so it is never a zone of its own.
_Avoid_: Training zone, Sweet Spot zone

**Intensity**:
How hard a session is relative to FTP: Intervals.icu's intensity factor as a percentage (IF × 100). A Workout carries its planned Intensity, an Activity its recorded one, and each detected interval its average power as %FTP.
_Avoid_: IF, intensity factor

**Normalized Power**:
An Activity's average power weighted toward its hard efforts, in watts, as calculated by Intervals.icu. Shown as NP.
_Avoid_: Weighted average power

**Variability Index**:
How evenly an Activity was paced: Normalized Power divided by average power, so 1 is perfectly steady. Shown as VI.

**Compliance**:
How closely an Activity followed its paired Workout, as Intervals.icu's percentage. Workout Details shows it beside Plan vs wykonanie. An Activity has none until Intervals.icu calculates it, or when the athlete asked Intervals.icu to ignore it.
_Avoid_: Adherence, match

**Elapsed Time**:
An Activity's time from start to finish, stops included. Moving time leaves the stops out.
_Avoid_: Duration (for a recorded Activity)

**Route**:
The GPS track of an Activity, i.e. where the athlete actually rode. A Workout has no Route of its own. An Activity ridden indoors, such as a trainer ride or a VirtualRide, or recorded without GPS, has no Route.
_Avoid_: Workout route, track, GPS trace

**Workout Status**:
The tri-state of a planned workout: `completed` (the Workout is paired to an Activity), `planned` (in the future, not paired yet), or `missed` (in the past, not paired). Derived from today's date at read time, never stored, so it moves from `planned` to `missed` as days pass without a refetch. Drives the green/gray/red status dots on Home and Calendar.
_Avoid_: Completion state, sync status

**Race**:
A competition on the athlete's Intervals.icu calendar, of any sport, with a Race Priority. A Race is always one day. It is not a Workout: it's the event the training builds toward. A Race paired to an Activity is completed and carries the same done marker as a completed Workout. An unpaired Race has no status: it's never planned or missed, because a Race paired to a Strava Activity can't be detected. Read-only in BH Cycling.
_Avoid_: Event, competition, race workout

**Race Priority**:
How much a Race matters to the athlete's season: `A` (a goal race), `B` (important) or `C` (a lower-key race, often ridden as training). Set by the athlete on Intervals.icu. Every surface lists a day's Races in Race order: by priority, then by start time with an all-day Race first, then by name.
_Avoid_: Race type, race category, race level

**Note**:
A free-text entry on the athlete's Intervals.icu calendar, for a single day or a range of days. It is not a Workout: it has no structure and no Workout Status. Read-only in BH Cycling.
_Avoid_: Comment, Workout description

**Note Markdown**:
A Note's text, a Workout's description on Workout Details, or a Race's description, rendered for reading. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, quotes); images degrade to their alt text, tables to stacked rows, links are styled but not tappable, and raw HTML tags are dropped while their text is kept, because a Note is a read-only briefing on a phone, not a document viewer.
_Avoid_: Note HTML, Rich Text

**Wellness**:
The athlete's day-by-day recovery and health data held on Intervals.icu, such as sleep or resting heart rate. Read-only in BH Cycling. It is a set of measurements, not a verdict on how ready the athlete is.
_Avoid_: Recovery, Readiness

**Wellness Entry**:
One athlete's Wellness record for one day. It may be missing or only partly filled, depending on what reached Intervals.icu that day.
_Avoid_: Wellness log, daily check-in

**Training Load**:
The strain of a session as Intervals.icu scores it: planned on a Workout, recorded on an Activity. A Wellness Entry carries the day's load, from which Intervals.icu builds Fitness and Fatigue.
_Avoid_: TSS, stress score

**HRV**:
Heart rate variability from a Wellness Entry, in milliseconds. BH Cycling shows rMSSD, or SDNN when that's all the device reports, as on Apple Watch, and never both.
_Avoid_: Variability (alone)

**Fitness**:
The athlete's long-term training load: a rolling average of recent daily load, weighted over weeks, as calculated by Intervals.icu. BH Cycling shows it and never calculates it.
_Avoid_: CTL, chronic training load

**Fatigue**:
The athlete's short-term training load: a rolling average of recent daily load, weighted over days, as calculated by Intervals.icu. BH Cycling shows it and never calculates it.
_Avoid_: ATL, acute training load

**Form**:
The balance between Fitness and Fatigue: how fresh the athlete is relative to their recent training. BH Cycling shows it as Fitness minus Fatigue from Intervals.icu's rounded values, the same way Intervals.icu does, and never models it.
_Avoid_: TSB, training stress balance

**Sign-in Method**:
How a user authenticates: `email` (email + password) and/or `google`. A user can have more than one (Firebase may auto-link Google to an existing email/password account). Change Password is offered whenever `email` is among them.
_Avoid_: provider, auth type, login type

**Account Deletion**:
Permanent, user-initiated removal of a BH Cycling account: the Firebase Auth user, all Firestore data under the user, and the app's authorization on Intervals.icu. It never deletes the athlete's workouts or activities on Intervals.icu — those belong to Intervals.icu, not to us.
_Avoid_: Account deactivation, closing account
