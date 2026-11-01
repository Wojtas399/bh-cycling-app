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

**Activity Details**:
The screen for one Unplanned Activity, a recorded session with no plan behind it. It's a sibling of Workout Details, not one of its modes.
_Avoid_: Unpaired workout details, activity mode

**Activity Profile**:
The recorded shape of an Activity's effort, drawn from intervals.icu's detected intervals and coloured by power zone. Shown on Activity Details, and on a completed Workout's Workout Details below its Workout Profile, the two on one time scale.
_Avoid_: Workout Profile, which is the planned shape

**Route**:
The GPS track of an Activity, i.e. where the athlete actually rode. A Workout has no Route of its own.
_Avoid_: Workout route, track, GPS trace

**Workout Status**:
The tri-state of a planned workout: `completed` (the Workout is paired to an Activity), `planned` (in the future, not paired yet), or `missed` (in the past, not paired). Derived from today's date at read time, never stored, so it moves from `planned` to `missed` as days pass without a refetch. Drives the green/gray/red status dots on Home and Calendar.
_Avoid_: Completion state, sync status

**Note**:
A free-text entry on the athlete's Intervals.icu calendar, for a single day or a range of days. It is not a Workout: it has no structure and no Workout Status. Read-only in BH Cycling.
_Avoid_: Comment, Workout description

**Note Markdown**:
A Note's text, or a Workout's description on Workout Details, rendered for reading. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, quotes); images degrade to their alt text, tables to stacked rows, links are styled but not tappable, and raw HTML tags are dropped while their text is kept, because a Note is a read-only briefing on a phone, not a document viewer.
_Avoid_: Note HTML, Rich Text

**Note**:
A free-text entry on the athlete's Intervals.icu calendar, for a single day or a range of days. It is not a Workout: it has no structure and no Workout Status. Read-only in BH Cycling.
_Avoid_: Comment, Workout description

**Note Markdown**:
A Note's text rendered for reading. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, quotes); images degrade to their alt text, tables to stacked rows, links are styled but not tappable, and raw HTML tags are dropped while their text is kept, because a Note is a read-only briefing on a phone, not a document viewer.
_Avoid_: Note HTML, Rich Text

**Fitness**:
The athlete's long-term training load: a rolling average of recent daily load, weighted over weeks, as calculated by Intervals.icu. BH Cycling shows it and never calculates it.
_Avoid_: CTL, chronic training load

**Fatigue**:
The athlete's short-term training load: a rolling average of recent daily load, weighted over days, as calculated by Intervals.icu. BH Cycling shows it and never calculates it.
_Avoid_: ATL, acute training load

**Form**:
The balance between Fitness and Fatigue, as calculated by Intervals.icu: how fresh the athlete is relative to their recent training. BH Cycling shows it and never calculates it.
_Avoid_: TSB, training stress balance

**Sign-in Method**:
How a user authenticates: `email` (email + password) and/or `google`. A user can have more than one (Firebase may auto-link Google to an existing email/password account). Change Password is offered whenever `email` is among them.
_Avoid_: provider, auth type, login type

**Account Deletion**:
Permanent, user-initiated removal of a BH Cycling account: the Firebase Auth user, all Firestore data under the user, and the app's authorization on Intervals.icu. It never deletes the athlete's workouts or activities on Intervals.icu — those belong to Intervals.icu, not to us.
_Avoid_: Account deactivation, closing account
