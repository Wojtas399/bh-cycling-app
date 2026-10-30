import { otherViewStartDate } from '../calendarView';
import { toLocalDateString } from '../localDate';

/** The start date as `YYYY-MM-DD`, so failures read as calendar dates. */
function startDate(...args: Parameters<typeof otherViewStartDate>): string {
  return toLocalDateString(otherViewStartDate(...args));
}

describe('otherViewStartDate', () => {
  describe('leaving the month view', () => {
    it("opens today's week when today is in the visible month", () => {
      // October 2026; Thu 15 Oct is in the week of Mon 12 Oct.
      expect(startDate('monthly', new Date(2026, 9, 1), '2026-10-15')).toBe(
        '2026-10-12',
      );
    });

    it("opens today's week when today is in the month's first, partial week", () => {
      // October 2026 starts on a Thursday; Fri 2 Oct is in the week of Mon 28 Sep.
      expect(startDate('monthly', new Date(2026, 9, 1), '2026-10-02')).toBe(
        '2026-09-28',
      );
    });

    it("opens today's week when today is in the month's last, partial week", () => {
      // Sat 31 Oct 2026 is in the week of Mon 26 Oct, which ends on 1 Nov.
      expect(startDate('monthly', new Date(2026, 9, 1), '2026-10-31')).toBe(
        '2026-10-26',
      );
    });

    it("opens the week containing another month's 1st, from its Monday in the previous month", () => {
      // October 2026 starts on a Thursday; today is in November.
      expect(startDate('monthly', new Date(2026, 9, 1), '2026-11-04')).toBe(
        '2026-09-28',
      );
    });
  });

  describe('leaving the week view', () => {
    it("opens the month of the week's Monday when the week crosses into the next month", () => {
      // Mon 28 Sep – Sun 4 Oct 2026, with today in October.
      expect(startDate('weekly', new Date(2026, 8, 28), '2026-10-01')).toBe(
        '2026-09-01',
      );
    });

    it("opens the month of the week's Monday when the week crosses into the next year", () => {
      // Mon 28 Dec 2026 – Sun 3 Jan 2027, with today in January.
      expect(startDate('weekly', new Date(2026, 11, 28), '2027-01-02')).toBe(
        '2026-12-01',
      );
    });
  });
});
