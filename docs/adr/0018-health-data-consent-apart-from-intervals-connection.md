# Health Data Consent is given apart from connecting Intervals.icu

## Status

Accepted

## Context

Wellness (sleep, resting heart rate, HRV) is data concerning health, a special category under GDPR Article 9. In a free app the only workable legal basis for it is the athlete's explicit consent to BH Cycling's controller, which the consent page on Intervals.icu does not give: that page lets Intervals.icu share the data, nothing more. The connection used to ask for `WELLNESS:READ` together with the scopes for Workouts and Activities, so an athlete who only wanted their calendar had to accept health data too.

## Decision

- Connecting Intervals.icu asks only for the scopes for Workouts, Activities and Ride settings. `WELLNESS:READ` is asked for only once the athlete gives Health Data Consent in BH Cycling, from the prompt that Wellness, Fitness, Fatigue and Form already show when the scope is missing.
- The consent carries an age statement: only an athlete who confirms they are at least 16 can give it (GDPR Article 8 and the Polish age of digital consent).
- A Cloud Function records the consent under `users/{uid}`, apart from the Intervals.icu integration document, with when it was given, the consent version it was given to and the age statement. Clients can read the record and never write it, so it can serve as the proof Article 7(1) asks for.
- The record outlives the connection's access. It survives a reconnect after a 401, and a reconnect after the athlete withdrew the scope on Intervals.icu. It ends when the athlete withdraws it in Settings, disconnects Intervals.icu or deletes their account.
- Withdrawing in Settings authorizes again without `WELLNESS:READ`, so withdrawing is as easy as giving (Article 7(3)) and the connection for Workouts and Activities stays.
- The consent version changes only when what BH Cycling does with Wellness changes. A record for an older version no longer counts, and the athlete is asked again.

### Considered and rejected

- **One consent screen before connecting:** it keeps health data mandatory for every athlete, which data minimisation argues against.
- **Dropping `WELLNESS:READ`:** it removes the Article 9 question by removing Wellness, Fitness, Fatigue and Form.

## Consequences

- An athlete without the consent sees the prompt on Home and on Fitness, where it is the whole screen.
- The granted scope alone can't unlock Wellness any more: a stale token that still carries `WELLNESS:READ` shows nothing without a current consent record.
- Withdrawing goes through the Intervals.icu consent page again, because Intervals.icu applies the latest authorization's scopes to every token the app holds for the athlete.
