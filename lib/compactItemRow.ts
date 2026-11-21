import type { CalendarItem, UnplannedActivity } from './calendarItems';
import type { Race, RacePriority } from './races';
import type { WorkoutBlock } from './workoutProfile';
import type { CalendarWorkout, WorkoutStatus } from './workoutStatus';

interface CompactItemRowBase {
  title: string;
  durationSeconds?: number;
}

export type CompactItemRow =
  | (CompactItemRowBase & {
      kind: 'workout';
      status: WorkoutStatus;
      blocks: WorkoutBlock[];
    })
  | (CompactItemRowBase & {
      kind: 'activity';
      load?: number;
    })
  | (CompactItemRowBase & {
      kind: 'race';
      priority: RacePriority;
      paired: boolean;
      load?: number;
    });

export function compactItemRow(
  item: CalendarItem,
  stravaActivityTitle: string,
): CompactItemRow {
  if (item.kind === 'activity') {
    const { activity } = item;

    return {
      kind: 'activity',
      title: activity.isStravaActivity ? stravaActivityTitle : activity.name,
      ...durationAndRoundedLoad(activity.durationSeconds, activity.load),
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
        ? durationAndRoundedLoad(activity.durationSeconds, activity.load)
        : durationAndRoundedLoad(race.durationSeconds)),
    };
  }

  const { workout } = item;

  return {
    kind: 'workout',
    status: workout.status,
    title: workout.name,
    ...durationAndRoundedLoad(workout.durationSeconds),
    blocks: workout.blocks,
  };
}

function durationAndRoundedLoad(
  durationSeconds: number | undefined,
  load?: number,
): Pick<CompactItemRowBase, 'durationSeconds'> & { load?: number } {
  return {
    ...(durationSeconds !== undefined && { durationSeconds }),
    ...(load !== undefined && { load: Math.round(load) }),
  };
}

export interface ItemPressHandlers {
  onWorkoutPress: (workout: CalendarWorkout) => void;
  onActivityPress: (activity: UnplannedActivity) => void;
  onRacePress: (race: Race) => void;
}

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

export interface RowFigureWords {
  duration: (seconds: number) => string;
  load: (load: number) => string;
}

export function rowFigures(
  row: CompactItemRow,
  words: RowFigureWords,
): string[] {
  const load = row.kind === 'workout' ? undefined : row.load;

  return [
    ...(row.durationSeconds === undefined
      ? []
      : [words.duration(row.durationSeconds)]),
    ...(load === undefined ? [] : [words.load(load)]),
  ];
}

export interface CompactItemRowWords extends RowFigureWords {
  workout: (status: WorkoutStatus) => string;
  activity: string;
  race: (priority: RacePriority, paired: boolean) => string;
}

export function compactItemRowLabel(
  row: CompactItemRow,
  words: CompactItemRowWords,
): string {
  return [kindPhrase(row, words), row.title, ...rowFigures(row, words)].join(
    ', ',
  );
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
