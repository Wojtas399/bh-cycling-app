import type { CalendarData } from './calendarWorkouts';
import type { LocalDateString } from './localDate';
import { notesOn } from './notes';

/** What a Calendar day holds, as its screen-reader summary counts it. */
export interface DayCounts {
  workouts: number;
  activities: number;
  /** Every Note covering the day, those behind "+N" included. */
  notes: number;
}

/** Each count as the screen reader says it, plural form included. */
export interface DayCountLabels {
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
    workouts: items.filter(item => item.kind === 'workout').length,
    activities: items.filter(item => item.kind === 'activity').length,
    notes: notesOn(notes, date).length,
  };
}

/**
 * A Calendar day's screen-reader label: the day, then what it holds, zero
 * counts left out ("Poniedziałek, 5 października. 2 treningi, 3 notatki"), or
 * the day alone when it holds nothing.
 */
export function formatDayLabel(
  dayLabel: string,
  counts: DayCounts,
  labels: DayCountLabels,
): string {
  const parts = (['workouts', 'activities', 'notes'] as const)
    .filter(kind => counts[kind] > 0)
    .map(kind => labels[kind](counts[kind]));

  return parts.length > 0 ? `${dayLabel}. ${parts.join(', ')}` : dayLabel;
}
