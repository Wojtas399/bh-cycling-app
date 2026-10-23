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
