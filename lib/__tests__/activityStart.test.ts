import { formatActivityStart } from '../activityStart';

const labels = {
  weekdaysShort: ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'],
  monthsShort: [
    'sty',
    'lut',
    'mar',
    'kwi',
    'maj',
    'cze',
    'lip',
    'sie',
    'wrz',
    'paź',
    'lis',
    'gru',
  ],
};

describe('formatActivityStart', () => {
  it('shows the short weekday, date, year and start time', () => {
    expect(formatActivityStart('2026-10-22T16:42:10', labels).text).toBe(
      'czw., 22 paź 2026 · 16:42',
    );
  });

  it('reads the date and time with a comma for a screen reader', () => {
    expect(
      formatActivityStart('2026-10-22T16:42:10', labels).accessibilityLabel,
    ).toBe('czw., 22 paź 2026, 16:42');
  });

  it('names a Sunday by the last weekday label', () => {
    expect(formatActivityStart('2026-10-25T07:05:00', labels).text).toBe(
      'niedz., 25 paź 2026 · 7:05',
    );
  });
});
