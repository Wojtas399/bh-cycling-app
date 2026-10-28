import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';

/** What pairing reads off a Workout's event. */
export type PairableEvent = Pick<
  IntervalsCalendarEvent,
  'id' | 'paired_activity_id'
>;

/** How one Workout is paired, per ADR 0009. */
export interface WorkoutPairing {
  /**
   * Paired from either side, so its Workout Status is `completed` — even
   * when the Activity it names is not among those given.
   */
  completed: boolean;
  /**
   * The earliest Activity paired to it among those given, which sets the
   * Workout's day (ADR 0007); `null` when none is.
   */
  activity: IntervalsActivity | null;
}

export interface Pairings {
  /** One entry per given Workout, by event id. */
  byEventId: Map<number, WorkoutPairing>;
  /** IDs of the Activities paired to a given Workout: never Unplanned. */
  pairedActivityIds: Set<string>;
}

/**
 * Pairs Workouts and Activities from both sides (ADR 0009): an Activity is
 * paired to a Workout when the event names it (`paired_activity_id`) or it
 * names the event (`paired_event_id`). Primary keys only — never by date or
 * type. The one place this rule lives; Home, the Calendar and Workout
 * Details all read it.
 */
export function pairWorkouts(
  events: readonly PairableEvent[],
  activities: readonly IntervalsActivity[],
): Pairings {
  const byEventId = new Map<number, WorkoutPairing>();
  const pairedActivityIds = new Set<string>();

  for (const event of events) {
    // An empty id names nothing.
    const namedActivityId = event.paired_activity_id || null;
    const paired = activities.filter(
      activity =>
        activity.paired_event_id === event.id ||
        activity.id === namedActivityId,
    );

    for (const { id } of paired) pairedActivityIds.add(id);

    byEventId.set(event.id, {
      completed: namedActivityId !== null || paired.length > 0,
      activity: earliest(paired),
    });
  }

  return { byEventId, pairedActivityIds };
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
