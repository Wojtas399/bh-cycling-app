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
  unplannedStravaActivity,
  workoutItem,
} from '@/test-utils/calendarItems';
import { note } from '@/test-utils/notes';

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

  describe('the day label', () => {
    function labelOn(data: CalendarData, date: LocalDateString): string {
      const cell = cellOn(
        monthView(OCTOBER, data, A_DAY_OUTSIDE_OCTOBER, WORDS),
        date,
      );

      return cell.inMonth ? cell.label : 'no label on a neighbouring day';
    }

    it('follows the day with every count it holds', () => {
      const data: CalendarData = {
        itemsByDate: {
          '2026-10-05': [
            workoutItem({ id: 1, date: '2026-10-05' }),
            activityItem(unplannedActivity({ date: '2026-10-05' })),
            workoutItem({ id: 2, date: '2026-10-05' }),
          ],
          '2026-10-06': [workoutItem({ id: 3, date: '2026-10-06' })],
        },
        notes: [note({ start: '2026-10-05', end: '2026-10-07' })],
      };

      expect(labelOn(data, '2026-10-05')).toBe(
        'day 2026-10-05. 2 workouts, 1 activities, 1 notes',
      );
    });

    it('leaves the zero counts out', () => {
      const data: CalendarData = {
        itemsByDate: {
          '2026-10-05': [
            activityItem(unplannedActivity({ id: 'a1', date: '2026-10-05' })),
            activityItem(unplannedStravaActivity({ date: '2026-10-05' })),
          ],
        },
        notes: [],
      };

      expect(labelOn(data, '2026-10-05')).toBe('day 2026-10-05. 2 activities');
    });

    it('puts a lone Race first, with its priority', () => {
      const data: CalendarData = {
        itemsByDate: {
          '2026-10-14': [
            workoutItem({ date: '2026-10-14' }),
            raceItem({ priority: 'A', date: '2026-10-14' }),
          ],
        },
        notes: [note({ start: '2026-10-14', end: '2026-10-15' })],
      };

      expect(labelOn(data, '2026-10-14')).toBe(
        'day 2026-10-14. race A, 1 workouts, 1 notes',
      );
    });

    it('counts several Races, then lists their priorities in the order the day holds them', () => {
      const data: CalendarData = {
        itemsByDate: {
          '2026-10-17': [
            raceItem({ id: 1, priority: 'A', date: '2026-10-17' }),
            raceItem({ id: 2, priority: 'C', date: '2026-10-17' }),
            raceItem({ id: 3, priority: 'C', date: '2026-10-17' }),
            activityItem(unplannedActivity({ id: 'a1', date: '2026-10-17' })),
            activityItem(unplannedActivity({ id: 'a2', date: '2026-10-17' })),
          ],
        },
        notes: [],
      };

      expect(labelOn(data, '2026-10-17')).toBe(
        'day 2026-10-17. 3 races: A, C, C, 2 activities',
      );
    });

    it('counts every Note covering the day, the multi-day ones and those behind "+N" too', () => {
      const data: CalendarData = {
        itemsByDate: {},
        notes: [
          note({ id: 1, start: '2026-10-01', end: '2026-10-11' }),
          note({ id: 2, start: '2026-10-06', end: '2026-10-09' }),
          note({ id: 3, start: '2026-10-07', end: '2026-10-09' }),
          note({ id: 4, start: '2026-10-07', end: '2026-10-09' }),
          note({ id: 5, start: '2026-10-08', end: '2026-10-10' }),
        ],
      };

      expect(labelOn(data, '2026-10-07')).toBe('day 2026-10-07. 4 notes');
    });
  });
});

function cellOn(rows: MonthRow[], date: LocalDateString): MonthCell {
  const cell = rows
    .flatMap(row => row.cells)
    .find(candidate => candidate.date === date);

  if (cell === undefined) throw new Error(`No cell on ${date}`);

  return cell;
}
