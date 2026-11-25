import type { CalendarItem } from './calendarItems';
import type { RacePriority } from './races';
import type { WorkoutBlock } from './workoutProfile';
import type { WorkoutStatus } from './workoutStatus';

export type CompactItemDisplay =
  | { kind: 'workout'; status: WorkoutStatus; blocks: WorkoutBlock[] }
  | { kind: 'activity' }
  | { kind: 'race'; priority: RacePriority; paired: boolean };

export interface CompactItemRow {
  display: CompactItemDisplay;
  title: string;
  figures?: string;
  label: string;
}

export interface FigureWords {
  duration: (seconds: number) => string;
  load: (load: number) => string;
}

export interface CompactItemRowWords {
  stravaActivity: string;
  itemKind: {
    workout: (status: WorkoutStatus) => string;
    activity: string;
    race: (priority: RacePriority, paired: boolean) => string;
  };
  figures: { shown: FigureWords; spoken: FigureWords };
}

export function compactItemRow(
  item: CalendarItem,
  words: CompactItemRowWords,
): CompactItemRow {
  const { display, title, ...facts } = itemFacts(item, words.stravaActivity);
  const shown = figures(facts, words.figures.shown);

  return {
    display,
    title,
    ...(shown.length > 0 && { figures: shown.join(' · ') }),
    label: [
      kindPhrase(display, words.itemKind),
      title,
      ...figures(facts, words.figures.spoken),
    ].join(', '),
  };
}

interface Figures {
  durationSeconds?: number;
  load?: number;
}

interface ItemFacts extends Figures {
  display: CompactItemDisplay;
  title: string;
}

function itemFacts(item: CalendarItem, stravaActivityTitle: string): ItemFacts {
  switch (item.kind) {
    case 'activity': {
      const { activity } = item;

      return {
        display: { kind: 'activity' },
        title: activity.isStravaActivity ? stravaActivityTitle : activity.name,
        ...durationAndRoundedLoad(activity.durationSeconds, activity.load),
      };
    }
    case 'race': {
      const { race, activity } = item;

      return {
        display: {
          kind: 'race',
          priority: race.priority,
          paired: activity !== undefined,
        },
        title: race.name,
        ...(activity
          ? durationAndRoundedLoad(activity.durationSeconds, activity.load)
          : durationAndRoundedLoad(race.durationSeconds)),
      };
    }
    case 'workout': {
      const { workout } = item;

      return {
        display: {
          kind: 'workout',
          status: workout.status,
          blocks: workout.blocks,
        },
        title: workout.name,
        ...durationAndRoundedLoad(workout.durationSeconds),
      };
    }
  }
}

function durationAndRoundedLoad(
  durationSeconds: number | undefined,
  load?: number,
): Figures {
  return {
    ...(durationSeconds !== undefined && { durationSeconds }),
    ...(load !== undefined && { load: Math.round(load) }),
  };
}

function figures({ durationSeconds, load }: Figures, words: FigureWords) {
  return [
    ...(durationSeconds === undefined ? [] : [words.duration(durationSeconds)]),
    ...(load === undefined ? [] : [words.load(load)]),
  ];
}

function kindPhrase(
  display: CompactItemDisplay,
  words: CompactItemRowWords['itemKind'],
): string {
  switch (display.kind) {
    case 'workout':
      return words.workout(display.status);
    case 'activity':
      return words.activity;
    case 'race':
      return words.race(display.priority, display.paired);
  }
}
