import type { Note } from '../notes';
import { weekNotes } from '../weekNotes';

function note(id: number, start: string, end: string): Note {
  return { id, name: `N${id}`, description: null, color: null, start, end };
}

// Monday 19 – Sunday 25 October 2026.
const WEEK = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
];

describe('weekNotes', () => {
  it('shows a banner per multi-day Note overlapping the week, in id order', () => {
    const notes = [
      note(1, '2026-10-12', '2026-10-20'), // ends on Monday
      note(2, '2026-10-21', '2026-10-22'), // single day
      note(3, '2026-10-24', '2026-10-28'), // runs into next week
      note(4, '2026-10-26', '2026-10-29'), // next week only
      note(5, '2026-10-10', '2026-10-19'), // ended before Monday
    ];

    expect(weekNotes(notes, WEEK).banners.map(n => n.id)).toEqual([1, 3]);
  });

  it('stripes each day with the multi-day Notes covering it, in id order', () => {
    const notes = [
      note(1, '2026-10-12', '2026-10-21'), // to Tuesday
      note(2, '2026-10-20', '2026-10-23'), // Tuesday to Thursday
      note(3, '2026-10-20', '2026-10-21'), // single day, not a stripe
    ];
    const { days } = weekNotes(notes, WEEK);
    const stripes = (date: string) => days[date].stripes.map(n => n.id);

    expect(stripes('2026-10-19')).toEqual([1]);
    expect(stripes('2026-10-20')).toEqual([1, 2]);
    expect(stripes('2026-10-22')).toEqual([2]);
    expect(stripes('2026-10-23')).toEqual([]);
  });

  it('gives each day a chip per single-day Note on it, in id order', () => {
    const notes = [
      note(1, '2026-10-20', '2026-10-21'),
      note(2, '2026-10-19', '2026-10-22'), // multi-day, not a chip
      note(3, '2026-10-20', '2026-10-21'),
      note(4, '2026-10-25', '2026-10-26'),
    ];
    const { days } = weekNotes(notes, WEEK);
    const chips = (date: string) => days[date].chips.map(n => n.id);

    expect(chips('2026-10-19')).toEqual([]);
    expect(chips('2026-10-20')).toEqual([1, 3]);
    expect(chips('2026-10-25')).toEqual([4]);
  });
});
