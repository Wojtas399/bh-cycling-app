import type { IntervalsCalendarEvent } from '../intervalsApi';
import {
  daysBetween,
  fromLocalDateString,
  toSortedDatedWorkoutEvents,
} from '../localDate';

describe('fromLocalDateString', () => {
  it('reads a date as local midnight', () => {
    expect(fromLocalDateString('2026-11-20')).toEqual(
      new Date(2026, 10, 20, 0, 0, 0),
    );
  });
});

describe('daysBetween', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('counts whole calendar days from one date to the next', () => {
    expect(daysBetween('2026-11-20', '2026-11-27')).toBe(7);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-11-20', '2026-11-18')).toBe(-2);
  });

  it.each(['Europe/Warsaw', 'America/New_York'])(
    'counts across a DST change in %s without skew',
    tz => {
      process.env.TZ = tz;

      expect(daysBetween('2026-10-24', '2026-11-02')).toBe(9);
      expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    },
  );
});

describe('toSortedDatedWorkoutEvents', () => {
  const event = (
    id: number,
    category: string,
    start_date_local: string,
  ): IntervalsCalendarEvent => ({
    id,
    category,
    name: `Event ${id}`,
    start_date_local,
  });

  it('keeps only Workouts, dated by their local start and in start order', () => {
    const late = event(1, 'WORKOUT', '2026-11-21T18:00:00');
    const note = event(2, 'NOTE', '2026-11-20T06:00:00');
    const early = event(3, 'WORKOUT', '2026-11-20T07:00:00');

    expect(toSortedDatedWorkoutEvents([late, note, early])).toEqual([
      { event: early, date: '2026-11-20' },
      { event: late, date: '2026-11-21' },
    ]);
  });
});
