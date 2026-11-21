import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';

export type PairableEvent = Pick<
  IntervalsCalendarEvent,
  'id' | 'paired_activity_id'
>;

export interface WorkoutPairing {
  completed: boolean;
  activity: IntervalsActivity | null;
}

export interface Pairings {
  byEventId: Map<number, WorkoutPairing>;
  pairedActivityIds: Set<string>;
  completedEventIds: Set<number>;
}

export function pairWorkouts(
  events: readonly PairableEvent[],
  activities: readonly IntervalsActivity[],
): Pairings {
  const byEventId = new Map<number, WorkoutPairing>();
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

function pair(
  event: PairableEvent,
  activities: readonly IntervalsActivity[],
): { completed: boolean; paired: IntervalsActivity[] } {
  const namedActivityId = nonEmptyPairedActivityId(event);
  const paired = activities.filter(
    activity =>
      activity.paired_event_id === event.id || activity.id === namedActivityId,
  );

  return { completed: namedActivityId !== null || paired.length > 0, paired };
}

function earliest(activities: IntervalsActivity[]): IntervalsActivity | null {
  return activities.reduce<IntervalsActivity | null>(
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
