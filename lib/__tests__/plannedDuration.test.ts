import type { IntervalsCalendarEvent } from '../intervalsApi';
import { plannedDurationSeconds } from '../plannedDuration';

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-10-14T08:00:00',
    ...overrides,
  };
}

describe('plannedDurationSeconds', () => {
  it('prefers the event moving_time', () => {
    expect(
      plannedDurationSeconds(
        event({ moving_time: 1800, workout_doc: { duration: 1700 } }),
      ),
    ).toBe(1800);
  });

  it('falls back to the workout_doc duration', () => {
    expect(
      plannedDurationSeconds(event({ workout_doc: { duration: 3600 } })),
    ).toBe(3600);
  });

  it('skips a zero moving_time for the workout_doc duration', () => {
    expect(
      plannedDurationSeconds(
        event({ moving_time: 0, workout_doc: { duration: 3600 } }),
      ),
    ).toBe(3600);
  });

  it('has no duration when intervals.icu sends zero, as for a ramp test', () => {
    expect(
      plannedDurationSeconds(
        event({ moving_time: 0, workout_doc: { duration: 0 } }),
      ),
    ).toBeUndefined();
  });

  it('has no duration when neither field is present', () => {
    expect(plannedDurationSeconds(event({}))).toBeUndefined();
  });
});
