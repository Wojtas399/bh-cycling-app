import { formatNoteDates } from '../noteDates';
import type { Note } from '../notes';
import pl from '@/i18n/locales/pl';

const LABELS = {
  weekdaysShort: pl.note.weekdaysShort,
  monthsShort: pl.note.monthsShort,
};

function note(start: string, end: string): Note {
  return { id: 1, name: null, description: null, color: null, start, end };
}

describe('formatNoteDates', () => {
  it('shows a one-day Note as its weekday and date', () => {
    expect(formatNoteDates(note('2026-10-19', '2026-10-20'), LABELS)).toBe(
      'pon., 19 paź',
    );
    expect(formatNoteDates(note('2026-10-25', '2026-10-26'), LABELS)).toBe(
      'niedz., 25 paź',
    );
  });

  it('shows a range within a month with the month once', () => {
    expect(formatNoteDates(note('2026-10-20', '2026-10-25'), LABELS)).toBe(
      '20–24 paź',
    );
  });

  it('shows a range across months with both months', () => {
    expect(formatNoteDates(note('2026-10-30', '2026-11-03'), LABELS)).toBe(
      '30 paź – 2 lis',
    );
  });

  it('shows a range across years with both years', () => {
    expect(formatNoteDates(note('2026-12-30', '2027-01-03'), LABELS)).toBe(
      '30 gru 2026 – 2 sty 2027',
    );
  });
});
