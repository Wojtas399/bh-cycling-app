import { isCyclingWorkout } from '../cyclingWorkout';

describe('isCyclingWorkout', () => {
  it.each([
    'Ride',
    'VirtualRide',
    'GravelRide',
    'MountainBikeRide',
    'EBikeRide',
    'EMountainBikeRide',
    'TrackRide',
    'Velomobile',
    'Handcycle',
  ])('counts a %s as a Cycling Workout', type => {
    expect(isCyclingWorkout({ type })).toBe(true);
  });

  it.each(['WeightTraining', 'Run', 'Swim', 'Yoga', 'Workout', 'Other'])(
    'counts a %s as a non-cycling Workout',
    type => {
      expect(isCyclingWorkout({ type })).toBe(false);
    },
  );

  it('counts a Workout without a type as a Cycling Workout', () => {
    expect(isCyclingWorkout({})).toBe(true);
  });
});
