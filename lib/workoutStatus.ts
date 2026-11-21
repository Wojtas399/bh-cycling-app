import type { LocalDateString } from './localDate';
import type { WorkoutBlock } from './workoutProfile';

export type WorkoutStatus = 'completed' | 'planned' | 'missed';

export interface CalendarWorkout {
  id: number;
  name: string;
  date: LocalDateString;
  status: WorkoutStatus;
  durationSeconds?: number;
  blocks: WorkoutBlock[];
  completedWithStravaActivity: boolean;
}

export type StoredWorkout = Omit<CalendarWorkout, 'status'>;

export function workoutStatus(
  workout: Pick<StoredWorkout, 'id' | 'date'>,
  completedEventIds: ReadonlySet<number>,
  today: LocalDateString,
): WorkoutStatus {
  if (completedEventIds.has(workout.id)) return 'completed';

  return workout.date < today ? 'missed' : 'planned';
}
