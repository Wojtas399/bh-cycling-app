import type { MondayBasedWeekday } from '../localDate';
import { type RowLength, noteBarInsets } from '../noteBarInsets';

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
