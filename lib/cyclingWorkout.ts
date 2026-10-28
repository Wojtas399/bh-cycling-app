import type { IntervalsCalendarEvent } from './intervalsApi';

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
