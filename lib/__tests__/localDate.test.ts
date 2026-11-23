import type { IntervalsCalendarEvent } from '../intervalsApi';
import {
  daysBetween,
  daysSinceMonday,
  eachDate,
  endOfMonth,
  endOfWeek,
  fromLocalDateString,
  fromYearMonth,
  startOfMonth,
  startOfWeek,
  toLocalDateString,
  toSortedDatedWorkoutEvents,
  toYearMonth,
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

describe('daysSinceMonday', () => {
  it('counts Monday as 0 and Sunday as 6', () => {
    const monday12October2026 = new Date(2026, 9, 12);
    const wednesday14October2026 = new Date(2026, 9, 14);
    const sunday18October2026 = new Date(2026, 9, 18);

    expect(daysSinceMonday(monday12October2026)).toBe(0);
    expect(daysSinceMonday(wednesday14October2026)).toBe(2);
    expect(daysSinceMonday(sunday18October2026)).toBe(6);
  });
});

describe('month boundaries', () => {
  it('spans the first to the last day of the month', () => {
    const midFebruary = new Date(2028, 1, 15, 18);

    expect(toLocalDateString(startOfMonth(midFebruary))).toBe('2028-02-01');
    expect(toLocalDateString(endOfMonth(midFebruary))).toBe('2028-02-29');
  });

  it('converts to and from the local year-month', () => {
    expect(toYearMonth(new Date(2026, 11, 31, 23, 59))).toBe('2026-12');
    expect(fromYearMonth('2026-01')).toEqual(new Date(2026, 0, 1));
  });
});

describe('week boundaries', () => {
  it("spans Monday to Sunday regardless of the anchor's time of day", () => {
    const lateThursday = new Date(2026, 5, 18, 23, 45);

    expect(toLocalDateString(startOfWeek(lateThursday))).toBe('2026-06-15');
    expect(toLocalDateString(endOfWeek(lateThursday))).toBe('2026-06-21');
    expect(startOfWeek(lateThursday).getHours()).toBe(0);
  });

  it('lists all seven days of a week', () => {
    const thursday = new Date(2026, 5, 18, 2, 30);

    expect(eachDate(startOfWeek(thursday), endOfWeek(thursday))).toEqual([
      '2026-06-15',
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
      '2026-06-21',
    ]);
  });

  it("lists every calendar day once, whatever the anchors' times of day or a DST change between them", () => {
    const lateBeforeEuropeanDstEnd = new Date(2026, 9, 24, 23, 30);
    const justAfterAmericanDstEnd = new Date(2026, 10, 2, 0, 15);

    expect(eachDate(lateBeforeEuropeanDstEnd, justAfterAmericanDstEnd)).toEqual(
      [
        '2026-10-24',
        '2026-10-25',
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
      ],
    );
  });
});
