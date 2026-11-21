import type { CalendarItem, RaceItem } from './calendarItems';
import type { CalendarData } from './calendarWorkouts';
import type { LocalDateString } from './localDate';
import { notesOn } from './notes';
import type { RacePriority } from './races';

export interface DayCounts {
  races: RacePriority[];
  workouts: number;
  activities: number;
  notes: number;
}

type NonRaceItem = Exclude<CalendarItem, RaceItem>;

export interface DayMarkers {
  races: RaceItem[];
  markers: NonRaceItem[];
  hasARace: boolean;
}

export interface DayCountLabels {
  race: (priority: RacePriority) => string;
  races: (count: number, joinedPriorities: string) => string;
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
    races: items.flatMap(item =>
      item.kind === 'race' ? [item.race.priority] : [],
    ),
    workouts: items.filter(item => item.kind === 'workout').length,
    activities: items.filter(item => item.kind === 'activity').length,
    notes: notesOn(notes, date).length,
  };
}

export function dayMarkers(items: CalendarItem[]): DayMarkers {
  const races = items.filter(isRaceItem);

  return {
    races,
    markers: items.filter(item => !isRaceItem(item)),
    hasARace: races.some(item => item.race.priority === 'A'),
  };
}

function isRaceItem(item: CalendarItem): item is RaceItem {
  return item.kind === 'race';
}

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

function racesLabel(races: RacePriority[], labels: DayCountLabels): string[] {
  if (races.length === 0) return [];

  if (races.length === 1) return [labels.race(races[0])];

  return [labels.races(races.length, races.join(', '))];
}
