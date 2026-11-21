import type { MondayBasedWeekday } from '../calendarWorkouts';
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

const OCTOBER_2026_FROM_THURSDAY_1ST = Array.from(
  { length: 31 },
  (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`,
);
const OCTOBER = OCTOBER_2026_FROM_THURSDAY_1ST;
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
  it('draws a single-day Note as one rounded, labelled cell in lane 0, the top one', () => {
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

  it('gives each Note, in id order, the lowest lane free across its span, reusing a lane once its Note ends', () => {
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

  it('rounds only the ends that are the Note’s real first and last day, starting each new row’s segment at its first cell, where the label goes', () => {
    const campFrom2To13OctoberAcrossThreeRows = note({
      start: '2026-10-02',
      end: '2026-10-14',
    });
    const camp = campFrom2To13OctoberAcrossThreeRows;
    const thirdRow = OCTOBER.slice(11, 18);

    expect(layoutNoteRow(FIRST_ROW, OCTOBER, [camp]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 4,
        lastColumn: 6,
        roundedStart: true,
        roundedEnd: false,
      }),
    ]);
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

  it('clips to the month, leaving neighbour-month cells empty and the clipped end square', () => {
    const autumnFrom27SeptemberTo2October = note({
      id: 1,
      start: '2026-09-27',
      end: '2026-10-03',
    });
    const allSaintsFrom30OctoberTo2November = note({
      id: 2,
      start: '2026-10-30',
      end: '2026-11-03',
    });
    const autumn = autumnFrom27SeptemberTo2October;
    const allSaints = allSaintsFrom30OctoberTo2November;

    expect(layoutNoteRow(FIRST_ROW, OCTOBER, [autumn]).segments).toEqual([
      expect.objectContaining({
        firstColumn: 3,
        lastColumn: 4,
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

function pointsAlongRow(length: RowLength, rowWidthPoints: number): number {
  return (length.percentOfRow / 100) * rowWidthPoints + length.offsetPoints;
}

describe('noteBarInsets', () => {
  const ROW_POINTS_OF_48_POINT_CELLS_2_APART = 348;
  const GAP_POINTS = 2;

  it.each<[string, MondayBasedWeekday, MondayBasedWeekday, number, number]>([
    ['one cell', 2, 2, 100, 200],
    ['a run of cells', 2, 4, 100, 100],
    ['the first cell', 0, 0, 0, 300],
    ['the last cell', 6, 6, 300, 0],
    ['the whole row', 0, 6, 0, 0],
  ])(
    'lines a bar over %s up with the cells’ edges',
    (_, firstColumn, lastColumn, left, right) => {
      const insets = noteBarInsets({ firstColumn, lastColumn }, GAP_POINTS);

      expect(
        pointsAlongRow(insets.left, ROW_POINTS_OF_48_POINT_CELLS_2_APART),
      ).toBeCloseTo(left);
      expect(
        pointsAlongRow(insets.right, ROW_POINTS_OF_48_POINT_CELLS_2_APART),
      ).toBeCloseTo(right);
    },
  );

  it('keeps the bar on its cells at any row width', () => {
    const rowPointsOf30PointCells2Apart = 222;
    const insets = noteBarInsets({ firstColumn: 1, lastColumn: 3 }, GAP_POINTS);

    expect(
      pointsAlongRow(insets.left, rowPointsOf30PointCells2Apart),
    ).toBeCloseTo(32);
    expect(
      pointsAlongRow(insets.right, rowPointsOf30PointCells2Apart),
    ).toBeCloseTo(96);
  });
});
