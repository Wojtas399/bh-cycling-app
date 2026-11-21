import type { IntervalsActivity } from './intervalsApi';

export type SharedActivity = IntervalsActivity & { name: string; type: string };

export function isStravaActivity(activity: IntervalsActivity): boolean {
  return !isSharedActivity(activity);
}

export function isSharedActivity(
  activity: IntervalsActivity,
): activity is SharedActivity {
  return activity.name != null && activity.type != null;
}

export function stravaActivityUrl(intervalsActivityId: string): string {
  return `https://www.strava.com/activities/${intervalsActivityId}`;
}
