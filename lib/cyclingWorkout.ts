import type { IntervalsCalendarEvent } from './intervalsApi';
import type { WorkoutStep } from './workoutProfile';

/** intervals.icu's ride types, per the `Cycling Workout` term in CONTEXT.md. */
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

/**
 * Whether the Workout is a Cycling Workout, so its steps describe a ride. A
 * Workout intervals.icu sends without a type counts as one, as before types
 * were read.
 */
export function isCyclingWorkout({
  type,
}: Pick<IntervalsCalendarEvent, 'type'>): boolean {
  return type === undefined || RIDE_TYPES.has(type);
}

/**
 * The doc's steps, only for a Cycling Workout: on any other, intervals.icu's
 * ride-step parser has taken lines of the plan for steps, so they mean nothing.
 */
export function rideSteps(
  event: Pick<IntervalsCalendarEvent, 'type' | 'workout_doc'>,
): WorkoutStep[] | undefined {
  return isCyclingWorkout(event) ? event.workout_doc?.steps : undefined;
}
