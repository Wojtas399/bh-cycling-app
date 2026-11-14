import type { CalendarItem, UnplannedActivity } from './calendarItems';
import type { Race, RacePriority } from './races';
import type { WorkoutBlock } from './workoutProfile';
import type { CalendarWorkout, WorkoutStatus } from './workoutStatus';

interface CompactItemRowBase {
  title: string;
  /** Left out when the item has none. */
  durationSeconds?: number;
}

/** What a week-view row draws for one Calendar item. */
export type CompactItemRow =
  | (CompactItemRowBase & {
      kind: 'workout';
      status: WorkoutStatus;
      /** The Workout Profile to draw small; empty when there is none. */
      blocks: WorkoutBlock[];
    })
  | (CompactItemRowBase & {
      kind: 'activity';
      /** Rounded to a whole point; left out when the Activity has none. */
      load?: number;
    })
  | (CompactItemRowBase & {
      kind: 'race';
      priority: RacePriority;
      /**
       * Paired to an Activity, which completes it and gives the row its
       * duration and load.
       */
      paired: boolean;
      /** The paired Activity's, rounded; never an unpaired Race's. */
      load?: number;
    });

/**
 * The week view's one-line row for `item`. `stravaTitle` is what a Strava
 * Activity, which has no name, is called. A paired Race shows its Activity's
 * duration and load, an unpaired one its planned duration. Only Activities and
 * paired Races carry a load: a Workout has no planned load to show.
 */
export function compactItemRow(
  item: CalendarItem,
  stravaTitle: string,
): CompactItemRow {
  if (item.kind === 'activity') {
    const { activity } = item;

    return {
      kind: 'activity',
      title: activity.isStravaActivity ? stravaTitle : activity.name,
      ...figures(activity.durationSeconds, activity.load),
    };
  }

  if (item.kind === 'race') {
    const { race, activity } = item;

    return {
      kind: 'race',
      priority: race.priority,
      paired: activity !== undefined,
      title: race.name,
      ...(activity
        ? figures(activity.durationSeconds, activity.load)
        : figures(race.durationSeconds)),
    };
  }

  const { workout } = item;

  return {
    kind: 'workout',
    status: workout.status,
    title: workout.name,
    ...figures(workout.durationSeconds),
    blocks: workout.blocks,
  };
}

/** The duration and rounded load, each only when set. */
function figures(
  durationSeconds: number | undefined,
  load?: number,
): Pick<CompactItemRowBase, 'durationSeconds'> & { load?: number } {
  return {
    ...(durationSeconds !== undefined && { durationSeconds }),
    ...(load !== undefined && { load: Math.round(load) }),
  };
}

/** What a compact row opens, one handler per thing it can open. */
export interface ItemPressHandlers {
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
}

/**
 * What tapping `item`'s compact row opens, like the cards do: a paired Race
 * opens its Activity, and a Strava Activity's row opens nothing, so a tap on
 * it reaches the day.
 */
export function compactItemRowPress(
  item: CalendarItem,
  { onWorkoutPress, onActivityPress, onRacePress }: ItemPressHandlers,
): (() => void) | undefined {
  switch (item.kind) {
    case 'workout':
      return () => onWorkoutPress(item.workout);
    case 'race': {
      const { race, activity } = item;

      return activity
        ? () => onActivityPress(activity)
        : () => onRacePress(race);
    }
    case 'activity': {
      const { activity } = item;

      return activity.isStravaActivity
        ? undefined
        : () => onActivityPress(activity);
    }
  }
}

/** The words a compact row's screen-reader label is built from. */
export interface CompactItemRowWords {
  /** A Workout with its status: "Trening wykonany". */
  workout: (status: WorkoutStatus) => string;
  /** An Unplanned Activity: "Aktywność". */
  activity: string;
  /** A Race with its priority, done when paired: "Wyścig A wykonany". */
  race: (priority: RacePriority, paired: boolean) => string;
  /** A duration as spoken: "1 godz. 15 min". */
  duration: (seconds: number) => string;
  /** A load as spoken: "obciążenie 26". */
  load: (load: number) => string;
}

/**
 * A compact row's screen-reader label: what it is and its status, then its
 * title, duration and load, each left out when missing ("Trening wykonany,
 * Sweet spot 3×12, 1 godz. 15 min").
 */
export function compactItemRowLabel(
  row: CompactItemRow,
  words: CompactItemRowWords,
): string {
  const load = row.kind === 'workout' ? undefined : row.load;
  const parts = [
    kindPhrase(row, words),
    row.title,
    ...(row.durationSeconds === undefined
      ? []
      : [words.duration(row.durationSeconds)]),
    ...(load === undefined ? [] : [words.load(load)]),
  ];

  return parts.join(', ');
}

function kindPhrase(row: CompactItemRow, words: CompactItemRowWords): string {
  switch (row.kind) {
    case 'workout':
      return words.workout(row.status);
    case 'activity':
      return words.activity;
    case 'race':
      return words.race(row.priority, row.paired);
  }
}
