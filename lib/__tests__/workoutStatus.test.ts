import { workoutStatus } from '../workoutStatus';

describe('workoutStatus', () => {
  const TODAY = '2026-07-25';
  const workout = (id: number, date: string) => ({ id, date });

  it('is completed when the workout id is in the completed set', () => {
    expect(workoutStatus(workout(1, '2026-07-20'), new Set([1]), TODAY)).toBe(
      'completed',
    );
  });

  it('is missed for a past workout that is not completed', () => {
    expect(workoutStatus(workout(1, '2026-07-24'), new Set([2]), TODAY)).toBe(
      'missed',
    );
  });

  it("is planned for today's workout that is not completed", () => {
    expect(workoutStatus(workout(1, TODAY), new Set(), TODAY)).toBe('planned');
  });

  it('is planned for a future workout that is not completed', () => {
    expect(workoutStatus(workout(1, '2026-07-26'), new Set(), TODAY)).toBe(
      'planned',
    );
  });
});
