import type { CalendarData } from '../calendarMonth';
import {
  type MonthCell,
  type MonthRow,
  type MonthWords,
  monthView,
} from '../calendarViewModels';
import type { LocalDateString } from '../localDate';
import {
  activityItem,
  raceItem,
  unplannedActivity,
  workoutItem,
} from '@/test-utils/calendarItems';

const OCTOBER_2026_FROM_THURSDAY_1ST = new Date(2026, 9, 1);
const OCTOBER = OCTOBER_2026_FROM_THURSDAY_1ST;
const A_DAY_OUTSIDE_OCTOBER = '2026-12-01';
const NOTHING: CalendarData = { itemsByDate: {}, notes: [] };

const WORDS: MonthWords = {
  day: day => `day ${day.date}`,
  dayCounts: {
    race: priority => `race ${priority}`,
    races: (count, priorities) => `${count} races: ${priorities}`,
    workouts: count => `${count} workouts`,
    activities: count => `${count} activities`,
    notes: count => `${count} notes`,
  },
  untitledNote: 'Untitled',
};

describe('monthView', () => {
  it('leaves the neighbouring months’ days inert, with just their date and day of month', () => {
    const rows = monthView(OCTOBER, NOTHING, A_DAY_OUTSIDE_OCTOBER, WORDS);

    expect(rows[0].cells.slice(0, 3)).toEqual([
      { inMonth: false, date: '2026-09-28', dayOfMonth: 28 },
      { inMonth: false, date: '2026-09-29', dayOfMonth: 29 },
      { inMonth: false, date: '2026-09-30', dayOfMonth: 30 },
    ]);
    expect(rows[rows.length - 1].cells[6]).toEqual({
      inMonth: false,
      date: '2026-11-01',
      dayOfMonth: 1,
    });
  });

  it('gives an empty in-month day just its date as its label, and opens that day when pressed', () => {
    const rows = monthView(OCTOBER, NOTHING, A_DAY_OUTSIDE_OCTOBER, WORDS);

    expect(cellOn(rows, '2026-10-07')).toEqual({
      inMonth: true,
      date: '2026-10-07',
      dayOfMonth: 7,
      isToday: false,
      races: [],
      markers: [],
      hasARace: false,
      hiddenNoteCount: 0,
      label: 'day 2026-10-07',
      press: {
        kind: 'day',
        day: {
          date: '2026-10-07',
          dayOfMonth: 7,
          weekday: 2,
          month: 9,
          year: 2026,
        },
      },
    });
  });

  it('marks today, and only today, as today', () => {
    const rows = monthView(OCTOBER, NOTHING, '2026-10-14', WORDS);

    expect(
      rows
        .flatMap(row => row.cells)
        .filter(cell => cell.inMonth && cell.isToday)
        .map(cell => cell.date),
    ).toEqual(['2026-10-14']);
  });

  it('splits a day’s Races, in the order the day holds them, from its Workout and Activity markers', () => {
    const bRace = raceItem({ id: 1, priority: 'B', date: '2026-10-14' });
    const cRace = raceItem({ id: 2, priority: 'C', date: '2026-10-14' });
    const workout = workoutItem({ id: 3, date: '2026-10-14' });
    const ride = activityItem(unplannedActivity({ date: '2026-10-14' }));
    const data: CalendarData = {
      itemsByDate: { '2026-10-14': [bRace, workout, cRace, ride] },
      notes: [],
    };

    const cell = cellOn(
      monthView(OCTOBER, data, A_DAY_OUTSIDE_OCTOBER, WORDS),
      '2026-10-14',
    );

    expect(cell).toMatchObject({
      races: [bRace, cRace],
      markers: [workout, ride],
      hasARace: false,
    });
  });

  it('rings the day when any of its Races is an A Race', () => {
    const data: CalendarData = {
      itemsByDate: {
        '2026-10-14': [
          raceItem({ id: 1, priority: 'C', date: '2026-10-14' }),
          raceItem({ id: 2, priority: 'A', date: '2026-10-14' }),
        ],
      },
      notes: [],
    };

    expect(
      cellOn(
        monthView(OCTOBER, data, A_DAY_OUTSIDE_OCTOBER, WORDS),
        '2026-10-14',
      ),
    ).toMatchObject({ hasARace: true });
  });
});

function cellOn(rows: MonthRow[], date: LocalDateString): MonthCell {
  const cell = rows
    .flatMap(row => row.cells)
    .find(candidate => candidate.date === date);

  if (cell === undefined) throw new Error(`No cell on ${date}`);

  return cell;
}
