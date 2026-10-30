import { type RowLength, layoutNoteRow, noteBarInsets } from '../noteBars';
import type { Note } from '../notes';

function note(overrides: Partial<Note>): Note {
  return {
    id: 1,
    name: 'Wolne',
    description: null,
    color: null,
    start: '2026-10-07',
    end: '2026-10-08',
    ...overrides,
  };
}

// October 2026 starts on a Thursday.
const OCTOBER = Array.from(
  { length: 31 },
  (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`,
);
const FIRST_ROW = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
];
const SECOND_ROW = OCTOBER.slice(4, 11);
const LAST_ROW = [...OCTOBER.slice(25), '2026-11-01'];

describe('layoutNoteRow', () => {
  it('draws a single-day Note as one rounded, labelled cell in lane 0', () => {
    const wolne = note({ start: '2026-10-07', end: '2026-10-08' });

    expect(layoutNoteRow(SECOND_ROW, OCTOBER, [wolne])).toEqual({
      segments: [
        {
          note: wolne,
          lane: 0,
          firstColumn: 2,
          lastColumn: 2,
          roundedStart: true,
          roundedEnd: true,
        },
      ],
      overflowByDate: {},
    });
  });

  it('ignores Notes that miss the row', () => {
    const earlier = note({ start: '2026-10-01', end: '2026-10-05' });
    const later = note({ id: 2, start: '2026-10-12', end: '2026-10-13' });

    expect(layoutNoteRow(SECOND_ROW, OCTOBER, [earlier, later])).toEqual({
      segments: [],
      overflowByDate: {},
    });
  });

  it('gives each Note, in id order, the lowest lane free across its span', () => {
    const camp = note({ id: 1, start: '2026-10-05', end: '2026-10-08' });
    const rest = note({ id: 2, start: '2026-10-06', end: '2026-10-07' });
    const race = note({ id: 3, start: '2026-10-08', end: '2026-10-09' });

    const { segments } = layoutNoteRow(SECOND_ROW, OCTOBER, [camp, rest, race]);

    expect(
      segments.map(({ note: { id }, lane, firstColumn, lastColumn }) => ({
        id,
        lane,
        firstColumn,
        lastColumn,
      })),
    ).toEqual([
      { id: 1, lane: 0, firstColumn: 0, lastColumn: 2 },
      { id: 2, lane: 1, firstColumn: 1, lastColumn: 1 },
      // Lane 0 is free again once the camp ends.
      { id: 3, lane: 0, firstColumn: 3, lastColumn: 3 },
    ]);
  });

  it('keeps a Note in one lane across the row, even where a lower one frees up', () => {
    const monday = note({ id: 1, start: '2026-10-05', end: '2026-10-06' });
    const week = note({ id: 2, start: '2026-10-05', end: '2026-10-10' });
    const friday = note({ id: 3, start: '2026-10-09', end: '2026-10-10' });

    const { segments } = layoutNoteRow(SECOND_ROW, OCTOBER, [
      monday,
      week,
      friday,
    ]);

    expect(segments.map(({ note: { id }, lane }) => [id, lane])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
    ]);
  });

  it('rounds only the ends that are the Note’s real first and last day', () => {
    // 2 – 13 October: starts in the first row, runs through the second and
    // ends in the third.
    const camp = note({ start: '2026-10-02', end: '2026-10-14' });
    const thirdRow = OCTOBER.slice(11, 18);

    expect(layoutNoteRow(FIRST_ROW, OCTOBER, [camp]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 4,
        lastColumn: 6,
        roundedStart: true,
        roundedEnd: false,
      }),
    ]);
    // A new row's segment starts at its first cell, where the label goes.
    expect(layoutNoteRow(SECOND_ROW, OCTOBER, [camp]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 0,
        lastColumn: 6,
        roundedStart: false,
        roundedEnd: false,
      }),
    ]);
    expect(layoutNoteRow(thirdRow, OCTOBER, [camp]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 0,
        lastColumn: 1,
        roundedStart: false,
        roundedEnd: true,
      }),
    ]);
  });

  it('clips to the month, leaving neighbour-month cells empty', () => {
    // 27 September – 2 October and 30 October – 2 November.
    const autumn = note({ id: 1, start: '2026-09-27', end: '2026-10-03' });
    const allSaints = note({ id: 2, start: '2026-10-30', end: '2026-11-03' });

    expect(layoutNoteRow(FIRST_ROW, OCTOBER, [autumn]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 3,
        lastColumn: 4,
        // The real start lies outside the month, so the bar runs off square.
        roundedStart: false,
        roundedEnd: true,
      }),
    ]);
    expect(layoutNoteRow(LAST_ROW, OCTOBER, [allSaints]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 4,
        lastColumn: 5,
        roundedStart: true,
        roundedEnd: false,
      }),
    ]);
  });

  it('ignores a Note that covers only neighbour-month days of the row', () => {
    const september = note({ start: '2026-09-28', end: '2026-09-30' });

    expect(layoutNoteRow(FIRST_ROW, OCTOBER, [september])).toEqual({
      segments: [],
      overflowByDate: {},
    });
  });

  it('counts the Notes past the second lane as "+N" on each day they cover', () => {
    const one = note({ id: 1, start: '2026-10-05', end: '2026-10-08' });
    const two = note({ id: 2, start: '2026-10-06', end: '2026-10-07' });
    const three = note({ id: 3, start: '2026-10-06', end: '2026-10-08' });
    const four = note({ id: 4, start: '2026-10-06', end: '2026-10-07' });

    const layout = layoutNoteRow(SECOND_ROW, OCTOBER, [one, two, three, four]);

    expect(layout.segments.map(segment => segment.note.id)).toEqual([1, 2]);
    expect(layout.overflowByDate).toEqual({
      '2026-10-06': 2,
      '2026-10-07': 1,
    });
  });

  it('counts "+N" only on the month’s own days', () => {
    const one = note({ id: 1, start: '2026-10-31', end: '2026-11-02' });
    const two = note({ id: 2, start: '2026-10-31', end: '2026-11-02' });
    const three = note({ id: 3, start: '2026-10-31', end: '2026-11-02' });

    expect(
      layoutNoteRow(LAST_ROW, OCTOBER, [one, two, three]).overflowByDate,
    ).toEqual({ '2026-10-31': 1 });
  });
});

/** The length in points in a row `width` points wide. */
function inPoints(length: RowLength, width: number): number {
  return (length.percent / 100) * width + length.offset;
}

describe('noteBarInsets', () => {
  // 48-point cells 2 apart make a 348-point row, cell N starting at 50 × N.
  const WIDTH = 348;
  const GAP = 2;

  it.each([
    ['one cell', 2, 2, 100, 200],
    ['a run of cells', 2, 4, 100, 100],
    ['the first cell', 0, 0, 0, 300],
    ['the last cell', 6, 6, 300, 0],
    ['the whole row', 0, 6, 0, 0],
  ])(
    'lines a bar over %s up with the cells’ edges',
    (_, firstColumn, lastColumn, left, right) => {
      const insets = noteBarInsets({ firstColumn, lastColumn }, GAP);

      expect(inPoints(insets.left, WIDTH)).toBeCloseTo(left);
      expect(inPoints(insets.right, WIDTH)).toBeCloseTo(right);
    },
  );

  it('keeps the bar on its cells at any row width', () => {
    // 30-point cells 2 apart: a 222-point row, cell N starting at 32 × N.
    const insets = noteBarInsets({ firstColumn: 1, lastColumn: 3 }, GAP);

    expect(inPoints(insets.left, 222)).toBeCloseTo(32);
    expect(inPoints(insets.right, 222)).toBeCloseTo(96);
  });
});
