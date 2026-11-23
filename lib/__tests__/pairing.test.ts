import type { IntervalsActivity } from '../intervalsApi';
import { type PairableEvent, pairWorkout } from '../pairing';

function workout(overrides: Partial<PairableEvent> = {}): PairableEvent {
  return { id: 1, paired_activity_id: null, ...overrides };
}

function activity(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'a1',
    type: 'Ride',
    start_date_local: '2026-11-20T08:00:00',
    moving_time: 3600,
    distance: 30_000,
    ...overrides,
  };
}

describe('pairWorkout', () => {
  it('pairs an Activity the event names', () => {
    const ride = activity({ id: 'a1' });

    expect(pairWorkout(workout({ paired_activity_id: 'a1' }), [ride])).toEqual({
      completed: true,
      activity: ride,
    });
  });

  it('pairs an Activity that names the event', () => {
    const ride = activity({ id: 'a1', paired_event_id: 1 });

    expect(pairWorkout(workout(), [ride])).toEqual({
      completed: true,
      activity: ride,
    });
  });

  it('never pairs by date or type alone', () => {
    const sameDayRide = activity({ start_date_local: '2026-11-20T08:00:00' });

    expect(pairWorkout(workout(), [sameDayRide])).toEqual({
      completed: false,
      activity: null,
    });
  });

  it('completes a Workout whose event names an Activity not among those given', () => {
    expect(pairWorkout(workout({ paired_activity_id: 'a9' }), [])).toEqual({
      completed: true,
      activity: null,
    });
  });

  it('treats an empty paired_activity_id as naming no Activity', () => {
    expect(
      pairWorkout(workout({ paired_activity_id: '' }), [activity({ id: '' })]),
    ).toEqual({ completed: false, activity: null });
  });

  it('pairs the earliest of the Activities paired to it, which sets its day', () => {
    const evening = activity({
      id: 'a2',
      paired_event_id: 1,
      start_date_local: '2026-11-21T18:00:00',
    });
    const morning = activity({
      id: 'a1',
      paired_event_id: 1,
      start_date_local: '2026-11-21T07:00:00',
    });

    expect(pairWorkout(workout(), [evening, morning]).activity).toBe(morning);
  });
});
