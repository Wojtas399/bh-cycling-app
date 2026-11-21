import { otherViewStartDate } from '../calendarView';
import { toLocalDateString } from '../localDate';

const OCTOBER_2026_FROM_THURSDAY_1ST = new Date(2026, 9, 1);
const WEEK_OF_MONDAY_28_SEPTEMBER_2026_TO_SUNDAY_4_OCTOBER = new Date(
  2026,
  8,
  28,
);
const WEEK_OF_MONDAY_28_DECEMBER_2026_TO_SUNDAY_3_JANUARY_2027 = new Date(
  2026,
  11,
  28,
);

function otherViewLocalStartDate(
  ...args: Parameters<typeof otherViewStartDate>
): string {
  return toLocalDateString(otherViewStartDate(...args));
}

describe('otherViewStartDate', () => {
  describe('leaving the month view', () => {
    it("opens today's week when today is in the visible month", () => {
      const thursday15October = '2026-10-15';
      const monday12October = '2026-10-12';

      expect(
        otherViewLocalStartDate(
          'monthly',
          OCTOBER_2026_FROM_THURSDAY_1ST,
          thursday15October,
        ),
      ).toBe(monday12October);
    });

    it("opens today's week when today is in the month's first, partial week", () => {
      const friday2October = '2026-10-02';
      const monday28September = '2026-09-28';

      expect(
        otherViewLocalStartDate(
          'monthly',
          OCTOBER_2026_FROM_THURSDAY_1ST,
          friday2October,
        ),
      ).toBe(monday28September);
    });

    it("opens today's week when today is in the month's last, partial week", () => {
      const saturday31October = '2026-10-31';
      const monday26OctoberOfTheWeekEndingSunday1November = '2026-10-26';

      expect(
        otherViewLocalStartDate(
          'monthly',
          OCTOBER_2026_FROM_THURSDAY_1ST,
          saturday31October,
        ),
      ).toBe(monday26OctoberOfTheWeekEndingSunday1November);
    });

    it("opens the week containing another month's 1st, from its Monday in the previous month", () => {
      const wednesday4November = '2026-11-04';
      const monday28September = '2026-09-28';

      expect(
        otherViewLocalStartDate(
          'monthly',
          OCTOBER_2026_FROM_THURSDAY_1ST,
          wednesday4November,
        ),
      ).toBe(monday28September);
    });
  });

  describe('leaving the week view', () => {
    it("opens the month of the week's Monday when the week crosses into the next month", () => {
      const thursday1October = '2026-10-01';

      expect(
        otherViewLocalStartDate(
          'weekly',
          WEEK_OF_MONDAY_28_SEPTEMBER_2026_TO_SUNDAY_4_OCTOBER,
          thursday1October,
        ),
      ).toBe('2026-09-01');
    });

    it("opens the month of the week's Monday when the week crosses into the next year", () => {
      const saturday2January2027 = '2027-01-02';

      expect(
        otherViewLocalStartDate(
          'weekly',
          WEEK_OF_MONDAY_28_DECEMBER_2026_TO_SUNDAY_3_JANUARY_2027,
          saturday2January2027,
        ),
      ).toBe('2026-12-01');
    });
  });
});
