import type { CalendarItem } from '../calendarItems';
import type { CalendarData } from '../calendarMonth';
import {
  type InMonthCell,
  type MonthRow,
  type MonthWords,
  type WeekDay,
  type WeekWords,
  monthView,
  weekView,
} from '../calendarViewModels';
import type { LocalDateString } from '../localDate';
import type { Note } from '../notes';
import type { WorkoutBlock } from '../workoutProfile';
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

    expect(inMonthCellOn(rows, '2026-10-07')).toEqual({
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

    const cell = inMonthCellOn(
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
      inMonthCellOn(
        monthView(OCTOBER, data, A_DAY_OUTSIDE_OCTOBER, WORDS),
        '2026-10-14',
      ),
    ).toMatchObject({ hasARace: true });
  });

  describe('the day label', () => {
    function labelOn(data: CalendarData, date: LocalDateString): string {
      return inMonthCellOn(
        monthView(OCTOBER, data, A_DAY_OUTSIDE_OCTOBER, WORDS),
        date,
      ).label;
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

  describe('the Note bars', () => {
    const FIRST_ROW = 0;
    const SECOND_ROW = 1;
    const THIRD_ROW = 2;
    const LAST_ROW = 4;

    function rowsWith(notes: Note[]): MonthRow[] {
      return monthView(
        OCTOBER,
        { itemsByDate: {}, notes },
        A_DAY_OUTSIDE_OCTOBER,
        WORDS,
      );
    }

    it('draws a single-day Note as one rounded, titled bar in lane 0, the top one', () => {
      const wolne = note({
        name: 'Wolne',
        start: '2026-10-07',
        end: '2026-10-08',
      });

      const row = rowsWith([wolne])[SECOND_ROW];

      expect(row.noteBars).toEqual([
        {
          note: wolne,
          lane: 0,
          firstColumn: 2,
          lastColumn: 2,
          roundedStart: true,
          roundedEnd: true,
          title: 'Wolne',
        },
      ]);
      expect(row.laneCount).toBe(1);
    });

    it('titles an untitled Note’s bar with the untitled fallback', () => {
      const untitled = note({
        name: null,
        start: '2026-10-07',
        end: '2026-10-08',
      });

      expect(rowsWith([untitled])[SECOND_ROW].noteBars).toEqual([
        expect.objectContaining({ title: 'Untitled' }),
      ]);
    });

    it('ignores Notes that miss the row, leaving it no lanes', () => {
      const earlier = note({ id: 1, start: '2026-10-01', end: '2026-10-05' });
      const later = note({ id: 2, start: '2026-10-12', end: '2026-10-13' });

      const row = rowsWith([earlier, later])[SECOND_ROW];

      expect(row.noteBars).toEqual([]);
      expect(row.laneCount).toBe(0);
    });

    it('gives each Note, in id order, the lowest lane free across its span, reusing a lane once its Note ends', () => {
      const camp = note({ id: 1, start: '2026-10-05', end: '2026-10-08' });
      const rest = note({ id: 2, start: '2026-10-06', end: '2026-10-07' });
      const race = note({ id: 3, start: '2026-10-08', end: '2026-10-09' });

      const row = rowsWith([camp, rest, race])[SECOND_ROW];

      expect(
        row.noteBars.map(({ note: { id }, lane, firstColumn, lastColumn }) => ({
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
      expect(row.laneCount).toBe(2);
    });

    it('keeps a Note in one lane across the row, even where a lower one frees up', () => {
      const monday = note({ id: 1, start: '2026-10-05', end: '2026-10-06' });
      const week = note({ id: 2, start: '2026-10-05', end: '2026-10-10' });
      const friday = note({ id: 3, start: '2026-10-09', end: '2026-10-10' });

      const row = rowsWith([monday, week, friday])[SECOND_ROW];

      expect(row.noteBars.map(({ note: { id }, lane }) => [id, lane])).toEqual([
        [1, 0],
        [2, 1],
        [3, 0],
      ]);
    });

    it('rounds only the ends that are the Note’s real first and last day, starting each new row’s bar at its first cell', () => {
      const campFrom2To13OctoberAcrossThreeRows = note({
        start: '2026-10-02',
        end: '2026-10-14',
      });
      const rows = rowsWith([campFrom2To13OctoberAcrossThreeRows]);

      expect(rows[FIRST_ROW].noteBars).toEqual([
        expect.objectContaining({
          firstColumn: 4,
          lastColumn: 6,
          roundedStart: true,
          roundedEnd: false,
        }),
      ]);
      expect(rows[SECOND_ROW].noteBars).toEqual([
        expect.objectContaining({
          firstColumn: 0,
          lastColumn: 6,
          roundedStart: false,
          roundedEnd: false,
        }),
      ]);
      expect(rows[THIRD_ROW].noteBars).toEqual([
        expect.objectContaining({
          firstColumn: 0,
          lastColumn: 1,
          roundedStart: false,
          roundedEnd: true,
        }),
      ]);
    });

    it('clips to the month, leaving neighbour-month cells bare and the clipped end square', () => {
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
      const rows = rowsWith([
        autumnFrom27SeptemberTo2October,
        allSaintsFrom30OctoberTo2November,
      ]);

      expect(rows[FIRST_ROW].noteBars).toEqual([
        expect.objectContaining({
          firstColumn: 3,
          lastColumn: 4,
          roundedStart: false,
          roundedEnd: true,
        }),
      ]);
      expect(rows[LAST_ROW].noteBars).toEqual([
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

      const row = rowsWith([september])[FIRST_ROW];

      expect(row.noteBars).toEqual([]);
      expect(row.laneCount).toBe(0);
    });

    it('counts the Notes past the second lane as "+N" on each day they cover', () => {
      const one = note({ id: 1, start: '2026-10-05', end: '2026-10-08' });
      const two = note({ id: 2, start: '2026-10-06', end: '2026-10-07' });
      const three = note({ id: 3, start: '2026-10-06', end: '2026-10-08' });
      const four = note({ id: 4, start: '2026-10-06', end: '2026-10-07' });

      const rows = rowsWith([one, two, three, four]);

      expect(rows[SECOND_ROW].noteBars.map(bar => bar.note.id)).toEqual([1, 2]);
      expect(rows[SECOND_ROW].laneCount).toBe(2);
      expect(hiddenNoteCounts(rows[SECOND_ROW])).toEqual({
        '2026-10-05': 0,
        '2026-10-06': 2,
        '2026-10-07': 1,
        '2026-10-08': 0,
        '2026-10-09': 0,
        '2026-10-10': 0,
        '2026-10-11': 0,
      });
    });

    it('counts "+N" only on the month’s own days', () => {
      const one = note({ id: 1, start: '2026-10-31', end: '2026-11-02' });
      const two = note({ id: 2, start: '2026-10-31', end: '2026-11-02' });
      const three = note({ id: 3, start: '2026-10-31', end: '2026-11-02' });

      const lastRow = rowsWith([one, two, three])[LAST_ROW];

      expect(hiddenNoteCounts(lastRow)).toEqual({
        '2026-10-26': 0,
        '2026-10-27': 0,
        '2026-10-28': 0,
        '2026-10-29': 0,
        '2026-10-30': 0,
        '2026-10-31': 1,
      });
      expect(lastRow.cells[6]).toEqual({
        inMonth: false,
        date: '2026-11-01',
        dayOfMonth: 1,
      });
    });
  });
});

const WEEK_OF_MONDAY_19_TO_SUNDAY_25_OCTOBER_2026 = new Date(2026, 9, 21);
const WEEK = WEEK_OF_MONDAY_19_TO_SUNDAY_25_OCTOBER_2026;
const [MON, TUE, WED, THU, FRI, SAT, SUN] = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
];
const A_DAY_OUTSIDE_THE_WEEK = '2026-12-01';

const BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 55, maxPct: 55, zone: 1 },
  { widthFraction: 0.5, minPct: 90, maxPct: 90, zone: 3 },
];

const WEEK_WORDS: WeekWords = {
  day: day => `day ${day.date}`,
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  monthNamesGenitive: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  untitledNote: 'Untitled',
  todayRail: dayLabel => `${dayLabel}, today`,
  noteLabel: (title, when) => `Note ${title}, ${when}`,
  moreNotes: {
    shown: count => `+${count} more`,
    spoken: count => `${count} more notes`,
  },
  stravaActivity: 'Strava Activity',
  itemKind: {
    workout: status => `${status} workout`,
    activity: 'Activity',
    race: (priority, paired) =>
      paired ? `${priority} race, raced` : `${priority} race`,
  },
  figures: {
    shown: {
      duration: seconds => `${seconds}s`,
      load: load => `TL ${load}`,
    },
    spoken: {
      duration: seconds => `${seconds} seconds`,
      load: load => `load ${load}`,
    },
  },
};

describe('weekView', () => {
  it('lays out an empty week as seven resting days, Monday first, each opening its day', () => {
    const { laneCount, days } = weekView(
      WEEK,
      NOTHING,
      A_DAY_OUTSIDE_THE_WEEK,
      WEEK_WORDS,
    );

    expect(laneCount).toBe(0);
    expect(days.map(day => day.date)).toEqual([
      MON,
      TUE,
      WED,
      THU,
      FRI,
      SAT,
      SUN,
    ]);
    expect(days[2]).toEqual({
      date: WED,
      dayOfMonth: 21,
      weekday: 'WED',
      isToday: false,
      railLabel: `day ${WED}`,
      crossings: [],
      rows: [{ kind: 'rest', key: 'rest', press: undefined }],
      press: {
        kind: 'day',
        day: {
          date: WED,
          dayOfMonth: 21,
          weekday: 2,
          month: 9,
          year: 2026,
        },
      },
    });
  });

  it('marks today, and only today, as today, and says so on its date rail', () => {
    const { days } = weekView(WEEK, NOTHING, THU, WEEK_WORDS);

    expect(
      days.map(({ date, isToday, railLabel }) => [date, isToday, railLabel]),
    ).toEqual([
      [MON, false, `day ${MON}`],
      [TUE, false, `day ${TUE}`],
      [WED, false, `day ${WED}`],
      [THU, true, `day ${THU}, today`],
      [FRI, false, `day ${FRI}`],
      [SAT, false, `day ${SAT}`],
      [SUN, false, `day ${SUN}`],
    ]);
  });

  describe('a Calendar Item row', () => {
    function rowsOn(
      date: LocalDateString,
      items: CalendarItem[],
    ): WeekDay['rows'] {
      return dayOn(
        weekView(
          WEEK,
          { itemsByDate: { [date]: items }, notes: [] },
          A_DAY_OUTSIDE_THE_WEEK,
          WEEK_WORDS,
        ),
        date,
      ).rows;
    }

    it('shows a Workout’s status, profile, name and planned duration, reads them, and opens the Workout', () => {
      const workout = workoutItem({
        id: 1,
        name: 'Sweet spot 3×12',
        date: WED,
        status: 'completed',
        durationSeconds: 4500,
        blocks: BLOCKS,
      });

      expect(rowsOn(WED, [workout])).toEqual([
        {
          kind: 'item',
          key: 'workout-1',
          display: { kind: 'workout', status: 'completed', blocks: BLOCKS },
          title: 'Sweet spot 3×12',
          figures: '4500s',
          label: 'completed workout, Sweet spot 3×12, 4500 seconds',
          press: { kind: 'workout', workout: workout.workout },
        },
      ]);
    });
  });
});

function dayOn(
  { days }: ReturnType<typeof weekView>,
  date: LocalDateString,
): WeekDay {
  const day = days.find(candidate => candidate.date === date);

  if (day === undefined) throw new Error(`No week day on ${date}`);

  return day;
}

function hiddenNoteCounts(row: MonthRow): Record<LocalDateString, number> {
  return Object.fromEntries(
    row.cells.flatMap(cell =>
      cell.inMonth ? [[cell.date, cell.hiddenNoteCount]] : [],
    ),
  );
}

function inMonthCellOn(rows: MonthRow[], date: LocalDateString): InMonthCell {
  const cell = rows
    .flatMap(row => row.cells)
    .find(candidate => candidate.date === date);

  if (cell === undefined || !cell.inMonth) {
    throw new Error(`No in-month cell on ${date}`);
  }

  return cell;
}
