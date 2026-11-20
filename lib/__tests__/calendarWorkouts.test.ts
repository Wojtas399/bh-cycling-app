import {
  daysSinceMonday,
  eachDate,
  endOfMonth,
  endOfWeek,
  fromYearMonth,
  startOfMonth,
  startOfWeek,
  toYearMonth,
} from '../calendarWorkouts';
import { toLocalDateString } from '../localDate';

describe('calendarWorkouts', () => {
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

      expect(
        eachDate(lateBeforeEuropeanDstEnd, justAfterAmericanDstEnd),
      ).toEqual([
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
      ]);
    });
  });
});
