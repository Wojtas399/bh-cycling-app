# BH Cycling

A cycling training app backed by Intervals.icu. Dark mode only, Polish UI labels.

## Language

**Workout**:
A training session planned on the athlete's Intervals.icu calendar, with a date and, usually, a structure of steps. It is the plan, not the ride itself.
_Avoid_: Event, session, training

**Activity**:
A session the athlete actually recorded on Intervals.icu, of any sport: a ride, a run, a strength session. An Activity that fulfils a Workout is paired to it, and the two show as one item on the Activity's day — even when the Workout was planned for another day — as on Intervals.icu.
_Avoid_: Ride, completed workout

**Unplanned Activity**:
An Activity not paired to any Workout, e.g. a spontaneous Zwift ride. It shows on its own day alongside that day's Workouts. It has no Workout Status: status describes a plan, and there is none.
_Avoid_: Free ride (a kind of planned Workout), extra workout, unpaired ride

**Strava Activity**:
An Activity intervals.icu received from Strava but can't share through its API, so only its day is known. It's an Unplanned Activity that has no details.
_Avoid_: Stub, hidden activity

**Activity Details**:
The screen for one Unplanned Activity, a recorded session with no plan behind it. It's a sibling of Workout Details, not one of its modes.
_Avoid_: Unpaired workout details, activity mode

**Activity Profile**:
The recorded shape of an Activity's effort, drawn from intervals.icu's detected intervals and coloured by power zone.
_Avoid_: Workout Profile, which is the planned shape

**Route**:
The GPS track of an Activity, i.e. where the athlete actually rode. A Workout has no Route of its own.
_Avoid_: Workout route, track, GPS trace

**Workout Status**:
The tri-state of a planned workout: `completed` (a matching Activity exists), `planned` (in the future, no matching Activity yet), or `missed` (in the past, no matching Activity). Derived from today's date at read time, never stored, so it moves from `planned` to `missed` as days pass without a refetch. Drives the green/gray/red status dots on Home and Calendar.
_Avoid_: Completion state, sync status

**Note**:
A free-text entry on the athlete's Intervals.icu calendar, for a single day or a range of days. It is not a Workout: it has no structure and no Workout Status. Read-only in BH Cycling.
_Avoid_: Comment, Workout description

**Note Markdown**:
A Note's text rendered for reading. Text structure renders (paragraphs, bullets, bold, italic, headings, rules, quotes); images degrade to their alt text, tables to stacked rows, links are styled but not tappable, and raw HTML tags are dropped while their text is kept, because a Note is a read-only briefing on a phone, not a document viewer.
_Avoid_: Note HTML, Rich Text

**Sign-in Method**:
How a user authenticates: `email` (email + password) and/or `google`. A user can have more than one (Firebase may auto-link Google to an existing email/password account). Change Password is offered whenever `email` is among them.
_Avoid_: provider, auth type, login type

**Account Deletion**:
Permanent, user-initiated removal of a BH Cycling account: the Firebase Auth user, all Firestore data under the user, and the app's authorization on Intervals.icu. It never deletes the athlete's workouts or activities on Intervals.icu — those belong to Intervals.icu, not to us.
_Avoid_: Account deactivation, closing account
