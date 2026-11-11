import pl from '../../i18n/locales/pl';
import { formatMonthTitle } from '../formatMonthTitle';

const { monthNames } = pl.calendar;

describe('formatMonthTitle', () => {
  it("names the date's month and year", () => {
    expect(formatMonthTitle(new Date(2026, 9, 5), monthNames)).toBe(
      'Październik 2026',
    );
  });

  it('names January by the first month name', () => {
    expect(formatMonthTitle(new Date(2027, 0, 1), monthNames)).toBe(
      'Styczeń 2027',
    );
  });

  it("reads the local date, so New Year's Eve at 23:59 is still December", () => {
    expect(formatMonthTitle(new Date(2026, 11, 31, 23, 59), monthNames)).toBe(
      'Grudzień 2026',
    );
  });
});
