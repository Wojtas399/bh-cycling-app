# BH Cycling

A cycling training app backed by Intervals.icu. Dark mode only, Polish UI labels.

## Language

**Workout Status**:
The tri-state of a planned workout: `completed` (a matching Activity exists), `planned` (in the future, no matching Activity yet), or `missed` (in the past, no matching Activity). Drives the green/gray/red status dots on Home and Calendar.
_Avoid_: Completion state, sync status

**Sign-in Method**:
How a user authenticates: `email` (email + password) and/or `google`. A user can have more than one (Firebase may auto-link Google to an existing email/password account). Change Password is offered whenever `email` is among them.
_Avoid_: provider, auth type, login type

**Account Deletion**:
Permanent, user-initiated removal of a BH Cycling account: the Firebase Auth user, all Firestore data under the user, and the app's authorization on Intervals.icu. It never deletes the athlete's workouts or activities on Intervals.icu — those belong to Intervals.icu, not to us.
_Avoid_: Account deactivation, closing account
