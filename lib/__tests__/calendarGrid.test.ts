import { getMonthGrid, getWeekDays } from '../calendarGrid';

describe('getWeekDays', () => {
  it('returns Monday through Sunday of the anchor week', () => {
    const days = getWeekDays(new Date(2026, 9, 8, 15, 30)); // Thu 8 Oct 2026

    expect(days.map(day => day.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(days.map(day => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(days[0]).toEqual({
      date: '2026-10-05',
      dayOfMonth: 5,
      weekday: 0,
      month: 9,
      year: 2026,
    });
  });

  it('spans a month and year boundary', () => {
    const days = getWeekDays(new Date(2026, 11, 31)); // Thu 31 Dec 2026

    expect(days[0].date).toBe('2026-12-28');
    expect(days[6]).toEqual({
      date: '2027-01-03',
      dayOfMonth: 3,
      weekday: 6,
      month: 0,
      year: 2027,
    });
  });
});

describe('getMonthGrid', () => {
  it('lays the month out in Monday-first weeks, padded with dimmed neighbours', () => {
    const grid = getMonthGrid(new Date(2026, 9, 1)); // October 2026 starts on a Thursday

    expect(grid).toHaveLength(5);
    expect(grid.every(week => week.length === 7)).toBe(true);
    expect(grid[0].map(cell => [cell.date, cell.inMonth])).toEqual([
      ['2026-09-28', false],
      ['2026-09-29', false],
      ['2026-09-30', false],
      ['2026-10-01', true],
      ['2026-10-02', true],
      ['2026-10-03', true],
      ['2026-10-04', true],
    ]);
    expect(grid[4].map(cell => [cell.date, cell.inMonth])).toEqual([
      ['2026-10-26', true],
      ['2026-10-27', true],
      ['2026-10-28', true],
      ['2026-10-29', true],
      ['2026-10-30', true],
      ['2026-10-31', true],
      ['2026-11-01', false],
    ]);
  });

  it('adds no padding when the month starts on Monday and ends on Sunday', () => {
    const grid = getMonthGrid(new Date(2021, 1, 15)); // February 2021

    expect(grid).toHaveLength(4);
    expect(grid[0][0].date).toBe('2021-02-01');
    expect(grid[3][6].date).toBe('2021-02-28');
    expect(grid.flat().every(cell => cell.inMonth)).toBe(true);
  });

  it('grows to six weeks when the month needs them', () => {
    const grid = getMonthGrid(new Date(2026, 7, 1)); // August 2026: Sat 1st – Mon 31st

    expect(grid).toHaveLength(6);
    expect(grid[0][5].date).toBe('2026-08-01');
    expect(grid[5][0].date).toBe('2026-08-31');
    expect(grid[5][1]).toMatchObject({ date: '2026-09-01', inMonth: false });
  });
});
