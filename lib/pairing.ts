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
  /**
   * IDs of the events whose Workout Status is `completed`: every given
   * Workout paired from either side, plus any event a given Activity names —
   * given or not, as before ADR 0009.
   */
  completedEventIds: Set<number>;
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

/** How one Workout is paired among `activities`, by the rule above. */
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
  // An empty id names nothing.
  const namedActivityId = event.paired_activity_id || null;
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
