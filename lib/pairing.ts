import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';

export type PairableEvent = Pick<
  IntervalsCalendarEvent,
  'id' | 'paired_activity_id'
>;

export type PairableActivity = Pick<
  IntervalsActivity,
  'id' | 'start_date_local' | 'paired_event_id'
>;

export interface WorkoutPairing<Activity = IntervalsActivity> {
  completed: boolean;
  activity: Activity | null;
}

export interface Pairings<Activity> {
  byEventId: Map<number, WorkoutPairing<Activity>>;
  pairedActivityIds: Set<string>;
  completedEventIds: Set<number>;
}

export function pairWorkouts<Activity extends PairableActivity>(
  events: readonly PairableEvent[],
  activities: readonly Activity[],
): Pairings<Activity> {
  const byEventId = new Map<number, WorkoutPairing<Activity>>();
  const pairedActivityIds = new Set<string>();
  const completedEventIds = new Set<number>();

  for (const { paired_event_id } of activities) {
    if (typeof paired_event_id === 'number') {
      completedEventIds.add(paired_event_id);
    }
  }

  for (const event of events) {
    const { completed, paired } = pair(event, activities);

    for (const { id } of paired) pairedActivityIds.add(id);

    if (completed) completedEventIds.add(event.id);

    byEventId.set(event.id, { completed, activity: earliest(paired) });
  }

  return { byEventId, pairedActivityIds, completedEventIds };
}

export function pairWorkout(
  event: PairableEvent,
  activities: readonly IntervalsActivity[],
): WorkoutPairing {
  const { completed, paired } = pair(event, activities);

  return { completed, activity: earliest(paired) };
}

function pair<Activity extends PairableActivity>(
  event: PairableEvent,
  activities: readonly Activity[],
): { completed: boolean; paired: Activity[] } {
  const namedActivityId = nonEmptyPairedActivityId(event);
  const paired = activities.filter(
    activity =>
      activity.paired_event_id === event.id || activity.id === namedActivityId,
  );

  return { completed: namedActivityId !== null || paired.length > 0, paired };
}

function earliest<Activity extends PairableActivity>(
  activities: Activity[],
): Activity | null {
  return activities.reduce<Activity | null>(
    (first, activity) =>
      first && first.start_date_local <= activity.start_date_local
        ? first
        : activity,
    null,
  );
}

function nonEmptyPairedActivityId(event: PairableEvent): string | null {
  return event.paired_activity_id || null;
}
