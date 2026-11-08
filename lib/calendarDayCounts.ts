import type { CalendarData } from './calendarWorkouts';
import type { LocalDateString } from './localDate';
import { notesOn } from './notes';
import type { RacePriority } from './races';

/** What a Calendar day holds, as its screen-reader summary counts it. */
export interface DayCounts {
  /** The day's Races, by priority, in Race order (see `compareRaces`). */
  races: RacePriority[];
  workouts: number;
  activities: number;
  /** Every Note covering the day, those behind "+N" included. */
  notes: number;
}

/** Each count as the screen reader says it, plural form included. */
export interface DayCountLabels {
  /** A lone Race, with its priority: "wyścig A". */
  race: (priority: RacePriority) => string;
  /** Several Races, then their priorities joined: "2 wyścigi: A, C". */
  races: (count: number, priorities: string) => string;
  workouts: (count: number) => string;
  activities: (count: number) => string;
  notes: (count: number) => string;
}

export function dayCounts(
  { itemsByDate, notes }: CalendarData,
  date: LocalDateString,
): DayCounts {
  const items = itemsByDate[date] ?? [];

  return {
    // The day's items lead with its Races, already in Race order.
    races: items.flatMap(item =>
      item.kind === 'race' ? [item.race.priority] : [],
    ),
    workouts: items.filter(item => item.kind === 'workout').length,
    activities: items.filter(item => item.kind === 'activity').length,
    notes: notesOn(notes, date).length,
  };
}

/**
 * A Calendar day's screen-reader label: the day, then what it holds, its
 * Races first, zero counts left out ("Czwartek, 12 listopada. wyścig A,
 * 2 treningi, 3 notatki"), or the day alone when it holds nothing.
 */
export function formatDayLabel(
  dayLabel: string,
  counts: DayCounts,
  labels: DayCountLabels,
): string {
  const parts = [
    ...racesLabel(counts.races, labels),
    ...(['workouts', 'activities', 'notes'] as const)
      .filter(kind => counts[kind] > 0)
      .map(kind => labels[kind](counts[kind])),
  ];

  return parts.length > 0 ? `${dayLabel}. ${parts.join(', ')}` : dayLabel;
}

/** The day's Races with their priorities, or nothing when it has none. */
function racesLabel(races: RacePriority[], labels: DayCountLabels): string[] {
  if (races.length === 0) return [];

  if (races.length === 1) return [labels.race(races[0])];

  return [labels.races(races.length, races.join(', '))];
}
