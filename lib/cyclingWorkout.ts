import type { IntervalsCalendarEvent } from './intervalsApi';
import type { WorkoutStep } from './workoutProfile';

const RIDE_TYPES: ReadonlySet<string> = new Set([
  'Ride',
  'VirtualRide',
  'GravelRide',
  'MountainBikeRide',
  'EBikeRide',
  'EMountainBikeRide',
  'TrackRide',
  'Velomobile',
  'Handcycle',
]);

export function isCyclingWorkout({
  type,
}: Pick<IntervalsCalendarEvent, 'type'>): boolean {
  return type === undefined || RIDE_TYPES.has(type);
}

export function rideSteps(
  event: Pick<IntervalsCalendarEvent, 'type' | 'workout_doc'>,
): WorkoutStep[] | undefined {
  return isCyclingWorkout(event) ? event.workout_doc?.steps : undefined;
}
