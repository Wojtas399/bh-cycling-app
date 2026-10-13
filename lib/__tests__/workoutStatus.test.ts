import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';
import { joinWorkouts, workoutStatus } from '../workoutStatus';

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-07-25T08:00:00',
    ...overrides,
  };
}

function activity(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'a1',
    name: 'Sample activity',
    type: 'Ride',
    start_date_local: '2026-07-25T08:10:00',
    moving_time: 3600,
    distance: 30000,
    ...overrides,
  };
}

const ZONE_CONFIG = resolveZoneConfig();

describe('joinWorkouts', () => {
  it('excludes non-WORKOUT categories', () => {
    const events = [
      event({ id: 1, category: 'RACE', name: 'Race day' }),
      event({ id: 2, category: 'NOTE', name: 'Note' }),
      event({ id: 3, category: 'WORKOUT', name: 'Intervals' }),
    ];

    const { workouts } = joinWorkouts(events, [], ZONE_CONFIG);

    expect(workouts).toEqual([
      { id: 3, name: 'Intervals', date: '2026-07-25', blocks: [] },
    ]);
  });

  it('collects the IDs of events an activity is paired to', () => {
    const events = [event({ id: 1 }), event({ id: 2 })];
    const activities = [
      activity({ id: 'a1', paired_event_id: 2 }),
      activity({ id: 'a2', paired_event_id: 2 }),
      activity({ id: 'a3' }),
    ];

    const { completedEventIds } = joinWorkouts(events, activities, ZONE_CONFIG);

    expect(completedEventIds).toEqual([2]);
  });

  it('does not match an activity to an event by date/type alone', () => {
    const activities = [activity({ paired_event_id: undefined })];

    const { completedEventIds } = joinWorkouts(
      [event({ id: 1 })],
      activities,
      ZONE_CONFIG,
    );

    expect(completedEventIds).toEqual([]);
  });

  it('sorts workouts chronologically', () => {
    const events = [
      event({ id: 1, name: 'Later', start_date_local: '2026-07-25T18:00:00' }),
      event({
        id: 2,
        name: 'Earlier',
        start_date_local: '2026-07-25T06:00:00',
      }),
    ];

    const { workouts } = joinWorkouts(events, [], ZONE_CONFIG);

    expect(workouts.map(w => w.id)).toEqual([2, 1]);
  });

  it('attaches durationSeconds and profile blocks from the workout_doc', () => {
    const events = [
      event({
        id: 1,
        workout_doc: {
          duration: 3600,
          steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
        },
      }),
    ];

    const { workouts } = joinWorkouts(events, [], ZONE_CONFIG);

    expect(workouts[0].durationSeconds).toBe(3600);
    expect(workouts[0].blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('builds the blocks against the zone config it is given', () => {
    const events = [
      event({
        id: 1,
        workout_doc: {
          duration: 3600,
          steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
        },
      }),
    ];
    const customConfig = resolveZoneConfig({ powerZones: [60, 80, 95] });

    const { workouts } = joinWorkouts(events, [], customConfig);

    expect(workouts[0].blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
  });

  it('returns nothing when there are no events', () => {
    expect(joinWorkouts([], [], ZONE_CONFIG)).toEqual({
      workouts: [],
      completedEventIds: [],
    });
  });
});

describe('workoutStatus', () => {
  const TODAY = '2026-07-25';
  const workout = (id: number, date: string) => ({
    id,
    name: 'Ride',
    date,
    blocks: [],
  });

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
