import type { Note } from '../notes';
import { weekNotes } from '../weekNotes';

/** A Note from `start` up to, not including, `end`. */
function note(id: number, start: string, end: string): Note {
  return { id, name: `N${id}`, description: null, color: null, start, end };
}

// Monday 19 – Sunday 25 October 2026.
const [MON, TUE, WED, THU, FRI, SAT, SUN] = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
];
const WEEK = [MON, TUE, WED, THU, FRI, SAT, SUN];

describe('weekNotes', () => {
  it('lays out nothing for a week with no Notes', () => {
    const layout = weekNotes([], WEEK);

    expect(layout.lanes).toEqual([]);

    for (const date of WEEK) {
      expect(layout.days[date]).toEqual({
        crossings: [],
        rows: [],
        hiddenCount: 0,
      });
    }
  });

  it('gives a single-day Note a row on its day and no lane', () => {
    const wolne = note(1, WED, THU);
    const layout = weekNotes([wolne], WEEK);

    expect(layout.lanes).toEqual([]);
    expect(layout.days[WED]).toEqual({
      crossings: [],
      rows: [{ note: wolne, multiDay: false }],
      hiddenCount: 0,
    });
    expect(layout.days[TUE].rows).toEqual([]);
    expect(layout.days[THU].rows).toEqual([]);
  });

  it('runs a multi-day Note inside the week from its first to its last day', () => {
    const oboz = note(1, TUE, FRI); // Tuesday to Thursday
    const layout = weekNotes([oboz], WEEK);
    const lane = { note: oboz, lane: 0 };

    expect(layout.lanes).toEqual([lane]);
    expect(layout.days[MON].crossings).toEqual([]);
    expect(layout.days[TUE].crossings).toEqual([
      { ...lane, starts: true, ends: false },
    ]);
    expect(layout.days[WED].crossings).toEqual([
      { ...lane, starts: false, ends: false },
    ]);
    expect(layout.days[THU].crossings).toEqual([
      { ...lane, starts: false, ends: true },
    ]);
    expect(layout.days[FRI].crossings).toEqual([]);
  });

  it("gives a multi-day Note's title row to its first day only", () => {
    const oboz = note(1, TUE, FRI);
    const { days } = weekNotes([oboz], WEEK);

    expect(days[TUE].rows).toEqual([{ note: oboz, multiDay: true }]);
    expect(days[WED].rows).toEqual([]);
    expect(days[THU].rows).toEqual([]);
  });

  it('labels a Note carried in from last week on Monday, its line running off the top', () => {
    const blok = note(1, '2026-10-12', WED); // to Tuesday
    const { days } = weekNotes([blok], WEEK);

    expect(days[MON].crossings).toEqual([
      { note: blok, lane: 0, starts: false, ends: false },
    ]);
    expect(days[TUE].crossings).toEqual([
      { note: blok, lane: 0, starts: false, ends: true },
    ]);
    expect(days[MON].rows).toEqual([{ note: blok, multiDay: true }]);
    expect(days[TUE].rows).toEqual([]);
  });

  it('runs a Note going into next week off the bottom on Sunday', () => {
    const wyjazd = note(1, FRI, '2026-10-28'); // to next Tuesday
    const { days } = weekNotes([wyjazd], WEEK);

    expect(days[FRI].crossings).toEqual([
      { note: wyjazd, lane: 0, starts: true, ends: false },
    ]);
    expect(days[SUN].crossings).toEqual([
      { note: wyjazd, lane: 0, starts: false, ends: false },
    ]);
    expect(days[FRI].rows).toEqual([{ note: wyjazd, multiDay: true }]);
  });

  it('keeps each overlapping multi-day Note in its own lane all week, in id order', () => {
    const blok = note(1, '2026-10-12', FRI); // to Thursday
    const chory = note(2, TUE, THU); // Tuesday to Wednesday
    const wyjazd = note(3, WED, '2026-10-28'); // into next week
    const { lanes, days } = weekNotes([blok, chory, wyjazd], WEEK);
    const crossing = (date: string) =>
      days[date].crossings.map(({ note: n, lane }) => [n.id, lane]);

    expect(lanes).toEqual([
      { note: blok, lane: 0 },
      { note: chory, lane: 1 },
      { note: wyjazd, lane: 2 },
    ]);
    expect(crossing(MON)).toEqual([[1, 0]]);
    expect(crossing(TUE)).toEqual([
      [1, 0],
      [2, 1],
    ]);
    expect(crossing(WED)).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
    // Lane 0 and 1 are free by now, but Wyjazd stays in lane 2.
    expect(crossing(FRI)).toEqual([[3, 2]]);
    expect(crossing(SUN)).toEqual([[3, 2]]);
  });

  it('lays out Notes on Sunday only', () => {
    const wyjazd = note(1, SUN, '2026-10-28'); // into next week
    const wolne = note(2, SUN, '2026-10-26');
    const { lanes, days } = weekNotes([wyjazd, wolne], WEEK);

    expect(lanes).toEqual([{ note: wyjazd, lane: 0 }]);
    expect(days[SAT]).toEqual({ crossings: [], rows: [], hiddenCount: 0 });
    expect(days[SUN]).toEqual({
      crossings: [{ note: wyjazd, lane: 0, starts: true, ends: false }],
      rows: [
        { note: wyjazd, multiDay: true },
        { note: wolne, multiDay: false },
      ],
      hiddenCount: 0,
    });
  });

  it('shows at most 2 Note rows a day and counts the rest as hidden', () => {
    const notes = [
      note(1, THU, FRI),
      note(2, THU, FRI),
      note(3, THU, FRI),
      note(4, THU, FRI),
      note(5, FRI, SAT),
      note(6, FRI, SAT),
    ];
    const { days } = weekNotes(notes, WEEK);
    const shown = (date: string) => days[date].rows.map(row => row.note.id);

    expect(shown(THU)).toEqual([1, 2]);
    expect(days[THU].hiddenCount).toBe(2);
    expect(shown(FRI)).toEqual([5, 6]);
    expect(days[FRI].hiddenCount).toBe(0);
  });

  it('lists first-day multi-day Notes before single-day ones, each in id order', () => {
    const notes = [
      note(1, WED, THU), // single day
      note(2, WED, SAT), // multi-day, starts Wednesday
      note(3, WED, THU), // single day
      note(4, TUE, FRI), // multi-day, started Tuesday: no row on Wednesday
      note(5, WED, FRI), // multi-day, starts Wednesday
    ];
    const { days } = weekNotes(notes, WEEK);

    expect(days[WED].rows).toEqual([
      { note: notes[1], multiDay: true },
      { note: notes[4], multiDay: true },
    ]);
    expect(days[WED].hiddenCount).toBe(2);
  });

  it('leaves out Notes that ended before Monday or start after Sunday', () => {
    const notes = [
      note(1, '2026-10-10', MON), // ended on the Sunday before
      note(2, '2026-10-26', '2026-10-29'), // next week only
      note(3, '2026-10-18', MON), // single day, the Sunday before
    ];
    const layout = weekNotes(notes, WEEK);

    expect(layout.lanes).toEqual([]);

    for (const date of WEEK) {
      expect(layout.days[date].rows).toEqual([]);
    }
  });
});
