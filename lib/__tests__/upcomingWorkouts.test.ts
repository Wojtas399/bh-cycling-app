import type { IntervalsCalendarEvent } from '../intervalsApi';
import { getUpcomingWorkouts } from '../upcomingWorkouts';

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

const NOW = new Date(2026, 6, 25, 10, 0, 0); // 2026-07-25, local

describe('getUpcomingWorkouts', () => {
  it('excludes non-WORKOUT categories', () => {
    const events = [
      event({ id: 1, category: 'RACE', name: 'Race day' }),
      event({ id: 2, category: 'NOTE', name: 'Note' }),
      event({ id: 3, category: 'WORKOUT', name: 'Intervals' }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result).toEqual([{ id: 3, name: 'Intervals', dayLabel: 'today' }]);
  });

  it('includes events scheduled for today and tomorrow', () => {
    const events = [
      event({
        id: 1,
        name: 'Today ride',
        start_date_local: '2026-07-25T08:00:00',
      }),
      event({
        id: 2,
        name: 'Tomorrow ride',
        start_date_local: '2026-07-26T08:00:00',
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result).toEqual([
      { id: 1, name: 'Today ride', dayLabel: 'today' },
      { id: 2, name: 'Tomorrow ride', dayLabel: 'tomorrow' },
    ]);
  });

  it('excludes events outside the today/tomorrow window', () => {
    const events = [
      event({
        id: 1,
        name: 'Yesterday ride',
        start_date_local: '2026-07-24T08:00:00',
      }),
      event({
        id: 2,
        name: 'Day after tomorrow ride',
        start_date_local: '2026-07-27T08:00:00',
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result).toEqual([]);
  });

  it('labels events correctly as today or tomorrow', () => {
    const events = [
      event({
        id: 1,
        name: 'Morning ride',
        start_date_local: '2026-07-25T06:00:00',
      }),
      event({
        id: 2,
        name: 'Evening ride',
        start_date_local: '2026-07-26T20:00:00',
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result.find(w => w.id === 1)?.dayLabel).toBe('today');
    expect(result.find(w => w.id === 2)?.dayLabel).toBe('tomorrow');
  });

  it('sorts results chronologically', () => {
    const events = [
      event({
        id: 1,
        name: 'Later today',
        start_date_local: '2026-07-25T18:00:00',
      }),
      event({
        id: 2,
        name: 'Tomorrow morning',
        start_date_local: '2026-07-26T07:00:00',
      }),
      event({
        id: 3,
        name: 'Earlier today',
        start_date_local: '2026-07-25T06:00:00',
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result.map(w => w.id)).toEqual([3, 1, 2]);
  });

  it('returns an empty list when nothing matches', () => {
    const result = getUpcomingWorkouts([], NOW);

    expect(result).toEqual([]);
  });

  it('attaches durationSeconds from the workout_doc when present', () => {
    const events = [
      event({
        id: 1,
        name: 'Structured ride',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: { duration: 3600 },
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result[0].durationSeconds).toBe(3600);
  });

  it('maps workouts lacking a workout_doc without a duration', () => {
    const events = [
      event({
        id: 1,
        name: 'Unstructured ride',
        start_date_local: '2026-07-25T08:00:00',
      }),
    ];

    const result = getUpcomingWorkouts(events, NOW);

    expect(result[0].durationSeconds).toBeUndefined();
  });
});
