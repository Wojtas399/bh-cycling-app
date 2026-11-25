import { MONDAY_BASED_WEEKDAYS, type MondayBasedWeekday } from './localDate';

export interface RowLength {
  percentOfRow: number;
  offsetPoints: number;
}

export interface NoteBarColumns {
  firstColumn: MondayBasedWeekday;
  lastColumn: MondayBasedWeekday;
}

const ROW_CELLS = MONDAY_BASED_WEEKDAYS.length;

export function noteBarInsets(
  { firstColumn, lastColumn }: NoteBarColumns,
  gapPoints: number,
): { left: RowLength; right: RowLength } {
  return {
    left: lengthOfCellsWithTheirGaps(firstColumn, gapPoints),
    right: lengthOfCellsWithTheirGaps(ROW_CELLS - 1 - lastColumn, gapPoints),
  };
}

function lengthOfCellsWithTheirGaps(
  count: number,
  gapPoints: number,
): RowLength {
  return {
    percentOfRow: (count / ROW_CELLS) * 100,
    offsetPoints: (count * gapPoints) / ROW_CELLS,
  };
}
