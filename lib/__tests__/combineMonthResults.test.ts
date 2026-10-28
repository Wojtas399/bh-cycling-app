import type { CalendarItem } from '../calendarItems';
import { type MonthResult, combineMonthResults } from '../combineMonthResults';
import type { Note } from '../notes';

function workout(id: number, date: string): CalendarItem {
  return {
    kind: 'workout',
    workout: {
      id,
      name: `Workout ${id}`,
      date,
      status: 'planned',
      blocks: [],
      completedWithStravaActivity: false,
    },
  };
}

function month(overrides: Partial<MonthResult> = {}): MonthResult {
  return {
    data: undefined,
    isError: false,
    isFetching: false,
    isRefetching: false,
    ...overrides,
  };
}

function note(id: number, start: string, end: string): Note {
  return { id, name: `Note ${id}`, description: null, color: null, start, end };
}

const JUNE_10 = workout(1, '2026-06-10');

/** Every day of June 2026, with one workout on the 10th. */
const JUNE_DAYS: Record<string, CalendarItem[]> = Object.fromEntries(
  Array.from({ length: 30 }, (_, index) => {
    const date = `2026-06-${String(index + 1).padStart(2, '0')}`;

    return [date, date === '2026-06-10' ? [JUNE_10] : []];
  }),
);

const JUNE = { itemsByDate: JUNE_DAYS, notes: [] };

const JUNE_START = new Date(2026, 5, 1);
const JUNE_END = new Date(2026, 5, 30);

describe('combineMonthResults', () => {
  it('is pending with no data while any month has no data', () => {
    const result = combineMonthResults(
      JUNE_START,
      new Date(2026, 6, 5),
    )([month({ data: JUNE }), month({ isFetching: true })]);

    expect(result.isPending).toBe(true);
    expect(result.isError).toBe(false);
    expect(result.data).toBeUndefined();
  });

  it('is an error when a failed month has no data', () => {
    const result = combineMonthResults(
      JUNE_START,
      JUNE_END,
    )([month({ isError: true })]);

    expect(result.isError).toBe(true);
    expect(result.isPending).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('keeps the data and is not an error when a refetch fails', () => {
    const result = combineMonthResults(
      JUNE_START,
      JUNE_END,
    )([month({ data: JUNE, isError: true })]);

    expect(result.isError).toBe(false);
    expect(result.isPending).toBe(false);
    expect(result.data?.itemsByDate['2026-06-10']).toEqual([JUNE_10]);
  });

  it('merges a week spanning two months and slices it to the week', () => {
    const july3 = workout(2, '2026-07-03');
    const july = {
      itemsByDate: {
        '2026-07-01': [],
        '2026-07-02': [],
        '2026-07-03': [july3],
        '2026-07-04': [],
        '2026-07-05': [],
        '2026-07-06': [],
      },
      notes: [],
    };

    const result = combineMonthResults(
      new Date(2026, 5, 29),
      new Date(2026, 6, 5),
    )([month({ data: JUNE }), month({ data: july })]);

    expect(result.data?.itemsByDate).toEqual({
      '2026-06-29': [],
      '2026-06-30': [],
      '2026-07-01': [],
      '2026-07-02': [],
      '2026-07-03': [july3],
      '2026-07-04': [],
      '2026-07-05': [],
    });
  });

  it('lists a Note held by both months of a week once, in id order', () => {
    const camp = note(4, '2026-06-28', '2026-07-03');
    const julyNote = note(2, '2026-07-02', '2026-07-03');

    const result = combineMonthResults(
      new Date(2026, 5, 29),
      new Date(2026, 6, 5),
    )([
      month({ data: { ...JUNE, notes: [camp] } }),
      month({
        data: { itemsByDate: {}, notes: [julyNote, camp] },
      }),
    ]);

    expect(result.data?.notes).toEqual([julyNote, camp]);
  });

  it('keeps only the Notes overlapping the range', () => {
    const before = note(1, '2026-06-20', '2026-06-29');
    const lastDayBefore = note(2, '2026-06-27', '2026-06-30');
    const inside = note(3, '2026-07-01', '2026-07-02');
    const after = note(5, '2026-07-06', '2026-07-07');

    const result = combineMonthResults(
      new Date(2026, 5, 29),
      new Date(2026, 6, 5),
    )([
      month({ data: { ...JUNE, notes: [before, lastDayBefore] } }),
      month({ data: { itemsByDate: {}, notes: [inside, after] } }),
    ]);

    expect(result.data?.notes).toEqual([lastDayBefore, inside]);
  });

  it('is fetching or refetching while any month is', () => {
    const combine = combineMonthResults(JUNE_START, JUNE_END);

    expect(
      combine([month({ data: JUNE }), month({ data: JUNE, isFetching: true })])
        .isFetching,
    ).toBe(true);
    expect(
      combine([
        month({ data: JUNE }),
        month({ data: JUNE, isFetching: true, isRefetching: true }),
      ]).isRefetching,
    ).toBe(true);
    expect(
      combine([month({ data: JUNE }), month({ data: JUNE })]).isFetching,
    ).toBe(false);
  });
});
