import type { CalendarItem } from '../calendarItems';
import type { CalendarData } from '../calendarMonth';
import { type WeekDay, type WeekWords, weekView } from '../calendarViewModels';
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

const NOTHING: CalendarData = { itemsByDate: {}, notes: [] };
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
  rest: 'Rest',
  opensDay: 'Opens the day',
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
      railHint: 'Opens the day',
      crossings: [],
      rows: [{ kind: 'rest', key: 'rest', text: 'Rest', press: undefined }],
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

    it('shows an Unplanned Activity’s name, duration and rounded Training Load, reads them, and opens the Activity', () => {
      const ride = unplannedActivity({
        id: 'a1',
        name: 'Dojazd do pracy',
        date: WED,
        durationSeconds: 3600,
        load: 25.6,
      });

      expect(rowsOn(WED, [activityItem(ride)])).toEqual([
        {
          kind: 'item',
          key: 'activity-a1',
          display: { kind: 'activity' },
          title: 'Dojazd do pracy',
          figures: '3600s · TL 26',
          label: 'Activity, Dojazd do pracy, 3600 seconds, load 26',
          press: { kind: 'activity', activity: ride },
        },
      ]);
    });

    it('calls a Strava Activity by the Strava title and opens nothing, so the tap reaches its day', () => {
      const strava = unplannedStravaActivity({
        id: 'a2',
        date: WED,
        durationSeconds: 1800,
      });

      expect(rowsOn(WED, [activityItem(strava)])).toEqual([
        {
          kind: 'item',
          key: 'activity-a2',
          display: { kind: 'activity' },
          title: 'Strava Activity',
          figures: '1800s',
          label: 'Activity, Strava Activity, 1800 seconds',
          press: undefined,
        },
      ]);
    });

    it('shows an unpaired Race’s priority, name and planned duration, reads them, and opens the Race', () => {
      const race = raceItem({
        id: 7,
        name: 'Mazovia Maraton',
        priority: 'B',
        date: WED,
        durationSeconds: 7200,
      });

      expect(rowsOn(WED, [race])).toEqual([
        {
          kind: 'item',
          key: 'race-7',
          display: { kind: 'race', priority: 'B', paired: false },
          title: 'Mazovia Maraton',
          figures: '7200s',
          label: 'B race, Mazovia Maraton, 7200 seconds',
          press: { kind: 'race', race: race.race },
        },
      ]);
    });

    it('shows a paired Race as raced, with its own name but the Activity’s figures, and opens the Activity', () => {
      const raced = unplannedActivity({
        id: 'raced',
        name: 'Morning Ride',
        date: WED,
        durationSeconds: 10920,
        load: 209.7,
      });
      const race = raceItem(
        {
          id: 7,
          name: 'Mazovia Maraton',
          priority: 'A',
          date: WED,
          durationSeconds: 7200,
        },
        raced,
      );

      expect(rowsOn(WED, [race])).toEqual([
        {
          kind: 'item',
          key: 'race-7',
          display: { kind: 'race', priority: 'A', paired: true },
          title: 'Mazovia Maraton',
          figures: '10920s · TL 210',
          label: 'A race, raced, Mazovia Maraton, 10920 seconds, load 210',
          press: { kind: 'activity', activity: raced },
        },
      ]);
    });

    it.each(['completed', 'planned', 'missed'] as const)(
      'shows and reads a %s Workout by its Workout Status',
      status => {
        expect(
          rowsOn(WED, [workoutItem({ date: WED, name: 'Sweet spot', status })]),
        ).toEqual([
          expect.objectContaining({
            display: expect.objectContaining({ status }),
            label: `${status} workout, Sweet spot`,
          }),
        ]);
      },
    );

    it('leaves out the figures and profile a Workout does not have', () => {
      const [row] = rowsOn(WED, [workoutItem({ date: WED, blocks: [] })]);

      expect(row).not.toHaveProperty('figures');
      expect(row).toMatchObject({
        display: { kind: 'workout', blocks: [] },
        label: 'planned workout, Sweet spot',
      });
    });

    it('never shows a load for a Workout, even a completed one carrying one', () => {
      const { workout } = workoutItem({
        date: WED,
        status: 'completed',
        durationSeconds: 3600,
      });
      const workoutCarryingLoad = { ...workout, load: 80 };
      const withLoad: CalendarItem = {
        kind: 'workout',
        workout: workoutCarryingLoad,
      };

      expect(rowsOn(WED, [withLoad])).toEqual([
        expect.objectContaining({
          figures: '3600s',
          label: 'completed workout, Sweet spot, 3600 seconds',
        }),
      ]);
    });

    it('leaves out the duration an Activity does not have, keeping the load after the name', () => {
      expect(
        rowsOn(WED, [
          activityItem(unplannedActivity({ date: WED, load: 12.4 })),
        ]),
      ).toEqual([
        expect.objectContaining({
          figures: 'TL 12',
          label: 'Activity, Dojazd do pracy, load 12',
        }),
      ]);
    });

    it('leaves out the figures an Activity has none of', () => {
      const [row] = rowsOn(WED, [
        activityItem(unplannedActivity({ date: WED })),
      ]);

      expect(row).not.toHaveProperty('figures');
      expect(row).toMatchObject({ label: 'Activity, Dojazd do pracy' });
    });

    it.each(['A', 'B', 'C'] as const)(
      'shows and reads an unpaired %s Race by its priority, leaving out a planned duration it lacks',
      priority => {
        const [row] = rowsOn(WED, [raceItem({ date: WED, priority })]);

        expect(row).not.toHaveProperty('figures');
        expect(row).toMatchObject({
          display: { kind: 'race', priority, paired: false },
          label: `${priority} race, Mazovia Maraton`,
        });
      },
    );

    it('leaves out the figures a paired Race’s Activity lacks, never falling back to the plan', () => {
      const [row] = rowsOn(WED, [
        raceItem(
          { date: WED, durationSeconds: 7200 },
          unplannedStravaActivity({ id: 'raced', date: WED }),
        ),
      ]);

      expect(row).not.toHaveProperty('figures');
      expect(row).toMatchObject({ label: 'A race, raced, Mazovia Maraton' });
    });

    it('lists the day’s Calendar Items in the order the day holds them, with no Rest row', () => {
      const race = raceItem({ id: 7, date: WED });
      const workout = workoutItem({ id: 1, date: WED });
      const ride = activityItem(unplannedActivity({ id: 'a1', date: WED }));

      expect(rowsOn(WED, [race, workout, ride]).map(row => row.key)).toEqual([
        'race-7',
        'workout-1',
        'activity-a1',
      ]);
    });
  });

  describe('the Notes', () => {
    function weekWith(
      notes: Note[],
      itemsByDate: CalendarData['itemsByDate'] = {},
    ): ReturnType<typeof weekView> {
      return weekView(
        WEEK,
        { itemsByDate, notes },
        A_DAY_OUTSIDE_THE_WEEK,
        WEEK_WORDS,
      );
    }

    it('lists a single-day Note before the day’s Calendar Items, read with its day, opening the Note', () => {
      const wolne = note({ id: 1, name: 'Wolne', start: WED, end: THU });
      const workout = workoutItem({ id: 1, date: WED });

      const { laneCount, days } = weekWith([wolne], { [WED]: [workout] });

      expect(laneCount).toBe(0);
      expect(dayOn({ laneCount, days }, WED)).toMatchObject({
        crossings: [],
        rows: [
          {
            kind: 'note',
            key: 'note-1',
            note: wolne,
            multiDay: false,
            title: 'Wolne',
            label: `Note Wolne, day ${WED}`,
            press: { kind: 'note', note: wolne },
          },
          expect.objectContaining({ kind: 'item', key: 'workout-1' }),
        ],
      });
      expect(dayOn({ laneCount, days }, TUE).rows).toEqual([
        { kind: 'rest', key: 'rest', text: 'Rest', press: undefined },
      ]);
    });

    it('lists a multi-day Note on its first day only, with its short range, read with its whole range', () => {
      const oboz = note({ id: 1, name: 'Obóz', start: TUE, end: FRI });

      const week = weekWith([oboz]);

      expect(dayOn(week, TUE).rows).toEqual([
        {
          kind: 'note',
          key: 'note-1',
          note: oboz,
          multiDay: true,
          title: 'Obóz',
          shortRange: '20.10 – 22.10',
          label: 'Note Obóz, 20 – 22 October',
          press: { kind: 'note', note: oboz },
        },
        { kind: 'rest', key: 'rest', text: 'Rest', press: undefined },
      ]);
      expect(dayOn(week, WED).rows.map(row => row.kind)).toEqual(['rest']);
      expect(dayOn(week, THU).rows.map(row => row.kind)).toEqual(['rest']);
    });

    it('runs a multi-day Note’s lane from its first to its last day, starting and ending there', () => {
      const obozTuesdayToThursday = note({ id: 1, start: TUE, end: FRI });
      const oboz = obozTuesdayToThursday;

      const week = weekWith([oboz]);

      expect(week.laneCount).toBe(1);
      expect(crossingsByDay(week)).toEqual({
        [MON]: [],
        [TUE]: [{ note: oboz, lane: 0, starts: true, ends: false }],
        [WED]: [{ note: oboz, lane: 0, starts: false, ends: false }],
        [THU]: [{ note: oboz, lane: 0, starts: false, ends: true }],
        [FRI]: [],
        [SAT]: [],
        [SUN]: [],
      });
    });

    it('shows at most two Note rows, then "+N more" opening the day, then the Calendar Items', () => {
      const notes = [1, 2, 3, 4].map(id => note({ id, start: THU, end: FRI }));
      const workout = workoutItem({ id: 1, date: THU });

      const thursday = dayOn(weekWith(notes, { [THU]: [workout] }), THU);

      expect(thursday.rows).toEqual([
        expect.objectContaining({ kind: 'note', key: 'note-1' }),
        expect.objectContaining({ kind: 'note', key: 'note-2' }),
        {
          kind: 'moreNotes',
          key: 'more-notes',
          count: 2,
          text: '+2 more',
          label: '2 more notes',
          hint: 'Opens the day',
          press: thursday.press,
        },
        expect.objectContaining({ kind: 'item', key: 'workout-1' }),
      ]);
      expect(thursday.press).toEqual({
        kind: 'day',
        day: expect.objectContaining({ date: THU }),
      });
    });

    it('titles an untitled Note’s row, and reads it, with the untitled fallback', () => {
      const untitled = note({ id: 1, name: null, start: WED, end: THU });

      expect(dayOn(weekWith([untitled]), WED).rows).toEqual([
        expect.objectContaining({
          title: 'Untitled',
          label: `Note Untitled, day ${WED}`,
        }),
        expect.objectContaining({ kind: 'rest' }),
      ]);
    });

    it('lists a Note carried in from last week on Monday only, its lane running off the top', () => {
      const blokFromLastWeekToTuesday = note({
        id: 1,
        name: 'Blok',
        start: '2026-10-12',
        end: WED,
      });
      const blok = blokFromLastWeekToTuesday;

      const week = weekWith([blok]);

      expect(crossingsByDay(week)).toMatchObject({
        [MON]: [{ note: blok, lane: 0, starts: false, ends: false }],
        [TUE]: [{ note: blok, lane: 0, starts: false, ends: true }],
      });
      expect(noteKeysByDay(week)).toMatchObject({
        [MON]: ['note-1'],
        [TUE]: [],
      });
      expect(dayOn(week, MON).rows[0]).toMatchObject({
        shortRange: '12.10 – 20.10',
        label: 'Note Blok, 12 – 20 October',
      });
    });

    it('runs a Note going into next week off the bottom on Sunday', () => {
      const wyjazdFromFridayToNextTuesday = note({
        id: 1,
        start: FRI,
        end: '2026-10-28',
      });
      const wyjazd = wyjazdFromFridayToNextTuesday;

      const week = weekWith([wyjazd]);

      expect(crossingsByDay(week)).toMatchObject({
        [FRI]: [{ note: wyjazd, lane: 0, starts: true, ends: false }],
        [SUN]: [{ note: wyjazd, lane: 0, starts: false, ends: false }],
      });
      expect(noteKeysByDay(week)[FRI]).toEqual(['note-1']);
    });

    it('keeps each overlapping multi-day Note in its own lane all week, in id order, even once the lanes below it are free', () => {
      const blok = note({ id: 1, start: '2026-10-12', end: FRI });
      const chory = note({ id: 2, start: TUE, end: THU });
      const wyjazd = note({ id: 3, start: WED, end: '2026-10-28' });

      const week = weekWith([blok, chory, wyjazd]);
      const lanes = (date: LocalDateString) =>
        dayOn(week, date).crossings.map(({ note: { id }, lane }) => [id, lane]);

      expect(week.laneCount).toBe(3);
      expect(lanes(MON)).toEqual([[1, 0]]);
      expect(lanes(TUE)).toEqual([
        [1, 0],
        [2, 1],
      ]);
      expect(lanes(WED)).toEqual([
        [1, 0],
        [2, 1],
        [3, 2],
      ]);
      expect(lanes(FRI)).toEqual([[3, 2]]);
      expect(lanes(SUN)).toEqual([[3, 2]]);
    });

    it('lays out Notes on Sunday only', () => {
      const wyjazdIntoNextWeek = note({ id: 1, start: SUN, end: '2026-10-28' });
      const wolne = note({ id: 2, start: SUN, end: '2026-10-26' });

      const week = weekWith([wyjazdIntoNextWeek, wolne]);

      expect(week.laneCount).toBe(1);
      expect(dayOn(week, SAT)).toMatchObject({
        crossings: [],
        rows: [{ kind: 'rest' }],
      });
      expect(dayOn(week, SUN)).toMatchObject({
        crossings: [
          { note: wyjazdIntoNextWeek, lane: 0, starts: true, ends: false },
        ],
        rows: [
          { kind: 'note', note: wyjazdIntoNextWeek, multiDay: true },
          { kind: 'note', note: wolne, multiDay: false },
          { kind: 'rest' },
        ],
      });
    });

    it('stops hiding Notes on a day where two or fewer start', () => {
      const notes = [
        note({ id: 1, start: THU, end: FRI }),
        note({ id: 2, start: THU, end: FRI }),
        note({ id: 3, start: THU, end: FRI }),
        note({ id: 4, start: THU, end: FRI }),
        note({ id: 5, start: FRI, end: SAT }),
        note({ id: 6, start: FRI, end: SAT }),
      ];

      expect(dayOn(weekWith(notes), FRI).rows.map(row => row.key)).toEqual([
        'note-5',
        'note-6',
        'rest',
      ]);
    });

    it('lists first-day multi-day Notes before single-day ones, each in id order', () => {
      const singleDay = note({ id: 1, start: WED, end: THU });
      const multiDayFromWednesday = note({ id: 2, start: WED, end: SAT });
      const anotherSingleDay = note({ id: 3, start: WED, end: THU });
      const multiDayFromTuesdayWithNoRowOnWednesday = note({
        id: 4,
        start: TUE,
        end: FRI,
      });
      const anotherMultiDayFromWednesday = note({
        id: 5,
        start: WED,
        end: FRI,
      });

      const wednesday = dayOn(
        weekWith([
          singleDay,
          multiDayFromWednesday,
          anotherSingleDay,
          multiDayFromTuesdayWithNoRowOnWednesday,
          anotherMultiDayFromWednesday,
        ]),
        WED,
      );

      expect(wednesday.rows).toEqual([
        expect.objectContaining({ note: multiDayFromWednesday }),
        expect.objectContaining({ note: anotherMultiDayFromWednesday }),
        expect.objectContaining({ kind: 'moreNotes', count: 2 }),
        expect.objectContaining({ kind: 'rest' }),
      ]);
    });

    it('leaves out Notes that ended before Monday or start after Sunday', () => {
      const endedOnTheSundayBefore = note({
        id: 1,
        start: '2026-10-10',
        end: MON,
      });
      const nextWeekOnly = note({
        id: 2,
        start: '2026-10-26',
        end: '2026-10-29',
      });
      const singleDayOnTheSundayBefore = note({
        id: 3,
        start: '2026-10-18',
        end: MON,
      });

      const week = weekWith([
        endedOnTheSundayBefore,
        nextWeekOnly,
        singleDayOnTheSundayBefore,
      ]);

      expect(week.laneCount).toBe(0);
      expect(
        week.days.flatMap(day => [...day.crossings, ...noteRowsOf(day)]),
      ).toEqual([]);
    });
  });
});

function noteRowsOf(day: WeekDay): WeekDay['rows'] {
  return day.rows.filter(row => row.kind === 'note');
}

function noteKeysByDay({
  days,
}: ReturnType<typeof weekView>): Record<LocalDateString, string[]> {
  return Object.fromEntries(
    days.map(day => [day.date, noteRowsOf(day).map(row => row.key)]),
  );
}

function crossingsByDay({
  days,
}: ReturnType<typeof weekView>): Record<LocalDateString, WeekDay['crossings']> {
  return Object.fromEntries(days.map(day => [day.date, day.crossings]));
}

function dayOn(
  { days }: ReturnType<typeof weekView>,
  date: LocalDateString,
): WeekDay {
  const day = days.find(candidate => candidate.date === date);

  if (day === undefined) throw new Error(`No week day on ${date}`);

  return day;
}
