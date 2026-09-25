import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';
import { deriveWorkoutStatuses } from '../workoutStatus';

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

const NOW = new Date(2026, 6, 25, 10, 0, 0); // 2026-07-25, local
const ZONE_CONFIG = resolveZoneConfig();

describe('deriveWorkoutStatuses', () => {
  it('excludes non-WORKOUT categories', () => {
    const events = [
      event({ id: 1, category: 'RACE', name: 'Race day' }),
      event({ id: 2, category: 'NOTE', name: 'Note' }),
      event({ id: 3, category: 'WORKOUT', name: 'Intervals' }),
    ];

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result).toEqual([
      {
        id: 3,
        name: 'Intervals',
        date: '2026-07-25',
        status: 'planned',
        blocks: [],
      },
    ]);
  });

  it('marks an event as completed when a paired activity exists', () => {
    const events = [event({ id: 1, name: 'Threshold' })];
    const activities = [activity({ paired_event_id: 1 })];

    const result = deriveWorkoutStatuses(events, activities, NOW, ZONE_CONFIG);

    expect(result[0].status).toBe('completed');
  });

  it('does not match an activity to an event by date/type alone', () => {
    const events = [
      event({
        id: 1,
        name: 'Threshold',
        start_date_local: '2026-07-25T08:00:00',
      }),
    ];
    const activities = [
      activity({
        start_date_local: '2026-07-25T08:10:00',
        paired_event_id: undefined,
      }),
    ];

    const result = deriveWorkoutStatuses(events, activities, NOW, ZONE_CONFIG);

    expect(result[0].status).toBe('planned');
  });

  it('marks a past event with no paired activity as missed', () => {
    const events = [
      event({
        id: 1,
        name: 'Yesterday ride',
        start_date_local: '2026-07-24T08:00:00',
      }),
    ];

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result[0].status).toBe('missed');
  });

  it('marks today’s event with no paired activity as planned', () => {
    const events = [
      event({
        id: 1,
        name: 'Today ride',
        start_date_local: '2026-07-25T08:00:00',
      }),
    ];

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result[0].status).toBe('planned');
  });

  it('marks a future event with no paired activity as planned', () => {
    const events = [
      event({
        id: 1,
        name: 'Tomorrow ride',
        start_date_local: '2026-07-26T08:00:00',
      }),
    ];

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result[0].status).toBe('planned');
  });

  it('only matches the activity carrying the paired event id, ignoring others', () => {
    const events = [event({ id: 1 }), event({ id: 2, name: 'Other' })];
    const activities = [activity({ paired_event_id: 2 })];

    const result = deriveWorkoutStatuses(events, activities, NOW, ZONE_CONFIG);

    expect(result.find(w => w.id === 1)?.status).toBe('planned');
    expect(result.find(w => w.id === 2)?.status).toBe('completed');
  });

  it('sorts results chronologically', () => {
    const events = [
      event({ id: 1, name: 'Later', start_date_local: '2026-07-25T18:00:00' }),
      event({
        id: 2,
        name: 'Earlier',
        start_date_local: '2026-07-25T06:00:00',
      }),
    ];

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result.map(w => w.id)).toEqual([2, 1]);
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

    const result = deriveWorkoutStatuses(events, [], NOW, ZONE_CONFIG);

    expect(result[0].durationSeconds).toBe(3600);
    expect(result[0].blocks).toEqual([
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

    const result = deriveWorkoutStatuses(events, [], NOW, customConfig);

    expect(result[0].blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
  });

  it('returns an empty list when there are no events', () => {
    const result = deriveWorkoutStatuses([], [], NOW, ZONE_CONFIG);

    expect(result).toEqual([]);
  });
});
