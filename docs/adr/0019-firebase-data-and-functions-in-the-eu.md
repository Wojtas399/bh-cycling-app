# Firestore and Cloud Functions run in the EU

## Status

Accepted

## Context

Both Firebase projects were created with Firestore in `nam5` (a US multi-region) and Cloud Functions in `us-central1`. The app is for athletes in the EU, and Firestore holds each athlete's Intervals.icu token and their Health Data Consent record. Transferring them to the US is lawful under the EU-US Data Privacy Framework and the SCCs in Google's terms, but it must be disclosed and defended. A Firestore database's location can never change: moving it means deleting the database and creating it again. When this was decided, production held no data, and staging held only test data that the e2e seed recreates on Intervals.icu.

## Decision

- Both projects recreate their `(default)` Firestore database in an EU location, and deploy every Cloud Function to `europe-west1`.
- The app and the functions name the region in code, so a deploy or a call never falls back to `us-central1`.
- Sentry's organisation is created in its EU data region, for the same reason. That choice is also permanent.

### Considered and rejected

- **Staying in the US and disclosing the transfer:** lawful, but every later move would need a data migration, while the move cost minutes before launch.

## Consequences

- Firebase Authentication still stores accounts in the US, so the privacy policy still discloses a transfer to the US, for account data only.
- Recreating staging drops the e2e test user's Intervals.icu connection and Health Data Consent. The test user connects again once, by hand.
