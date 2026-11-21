import { isCyclingWorkout, rideSteps } from '../cyclingWorkout';

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

describe('rideSteps', () => {
  const steps = [{ duration: 600, text: '3x10 przysiad' }];

  it("reads a Cycling Workout's steps from its workout doc", () => {
    expect(rideSteps({ type: 'Ride', workout_doc: { steps } })).toEqual(steps);
  });

  it('has no steps for a non-cycling Workout, whose parsed steps are lines of its plan', () => {
    expect(
      rideSteps({ type: 'WeightTraining', workout_doc: { steps } }),
    ).toBeUndefined();
  });
});
