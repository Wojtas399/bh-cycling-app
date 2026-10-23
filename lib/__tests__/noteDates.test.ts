import { formatNoteDates, formatNoteRange } from '../noteDates';
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

describe('formatNoteRange', () => {
  const months = pl.calendar.monthNamesGenitive;

  it('names the month once for a range within it', () => {
    expect(formatNoteRange(note('2026-10-24', '2026-10-28'), months)).toBe(
      '24 – 27 października',
    );
  });

  it('names both months for a range across months', () => {
    expect(formatNoteRange(note('2026-10-30', '2026-11-03'), months)).toBe(
      '30 października – 2 listopada',
    );
  });

  it('names both years for a range across years', () => {
    expect(formatNoteRange(note('2026-12-30', '2027-01-03'), months)).toBe(
      '30 grudnia 2026 – 2 stycznia 2027',
    );
  });
});
