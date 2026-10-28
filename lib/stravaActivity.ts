import type { IntervalsActivity } from './intervalsApi';

/** An Activity intervals.icu shares: it carries a name and a sport type. */
export type SharedActivity = IntervalsActivity & { name: string; type: string };

/**
 * The one rule telling a Strava Activity (see CONTEXT.md) apart: intervals.icu
 * can't share it, so it comes without a `type` or `name`, and missing either
 * (absent or `null`) marks one. The calendar join and Workout Details read it.
 *
 * Activity Details reads the single-Activity body instead, where a native
 * Activity may lack a name and still be shown, so it checks `type` alone (see
 * `toStoredActivityDetails`).
 */
export function isStravaActivity(activity: IntervalsActivity): boolean {
  return !isSharedActivity(activity);
}

/** The inverse of `isStravaActivity`, narrowing to the name and type. */
export function isSharedActivity(
  activity: IntervalsActivity,
): activity is SharedActivity {
  return activity.name != null && activity.type != null;
}

/** The Strava page of a Strava Activity, by its intervals.icu id. */
export function stravaActivityUrl(id: string): string {
  return `https://www.strava.com/activities/${id}`;
}
