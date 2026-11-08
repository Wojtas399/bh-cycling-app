import {
  type DayCountLabels,
  dayCounts,
  formatDayLabel,
} from '../calendarDayCounts';
import type { CalendarItem } from '../calendarItems';
import type { CalendarData } from '../calendarWorkouts';
import type { Note } from '../notes';
import type { RacePriority } from '../races';

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

function activity(id: string, date: string): CalendarItem {
  return {
    kind: 'activity',
    activity: { id, name: `Activity ${id}`, type: 'Ride', date },
  };
}

function race(id: number, priority: RacePriority, date: string): CalendarItem {
  return {
    kind: 'race',
    race: { id, name: `Race ${id}`, priority, date, sport: 'Ride' },
  };
}

function note(id: number, start: string, end: string): Note {
  return { id, name: `Note ${id}`, description: null, color: null, start, end };
}

describe('dayCounts', () => {
  it('counts the day’s Workouts, Unplanned Activities and Notes', () => {
    const data: CalendarData = {
      itemsByDate: {
        '2026-10-05': [
          workout(1, '2026-10-05'),
          activity('a1', '2026-10-05'),
          workout(2, '2026-10-05'),
        ],
        '2026-10-06': [workout(3, '2026-10-06')],
      },
      notes: [note(1, '2026-10-05', '2026-10-06')],
    };

    expect(dayCounts(data, '2026-10-05')).toEqual({
      races: [],
      workouts: 2,
      activities: 1,
      notes: 1,
    });
  });

  it('lists the day’s Race Priorities in Race order, apart from the Workouts', () => {
    const data: CalendarData = {
      itemsByDate: {
        '2026-11-12': [
          race(1, 'A', '2026-11-12'),
          race(2, 'C', '2026-11-12'),
          race(3, 'C', '2026-11-12'),
          workout(4, '2026-11-12'),
        ],
      },
      notes: [],
    };

    expect(dayCounts(data, '2026-11-12')).toEqual({
      races: ['A', 'C', 'C'],
      workouts: 1,
      activities: 0,
      notes: 0,
    });
  });

  it('counts every Note covering the day: multi-day ones and those behind "+N"', () => {
    const data: CalendarData = {
      itemsByDate: { '2026-10-07': [] },
      notes: [
        note(1, '2026-10-01', '2026-10-10'),
        note(2, '2026-10-06', '2026-10-08'),
        note(3, '2026-10-07', '2026-10-08'),
        note(4, '2026-10-07', '2026-10-08'),
        note(5, '2026-10-08', '2026-10-09'),
      ],
    };

    expect(dayCounts(data, '2026-10-07')).toEqual({
      races: [],
      workouts: 0,
      activities: 0,
      notes: 4,
    });
  });

  it('counts zero for a day with nothing on it', () => {
    expect(dayCounts({ itemsByDate: {}, notes: [] }, '2026-10-07')).toEqual({
      races: [],
      workouts: 0,
      activities: 0,
      notes: 0,
    });
  });
});

describe('formatDayLabel', () => {
  const COUNTS: DayCountLabels = {
    race: priority => `wyścig ${priority}`,
    races: (count, priorities) => `${count} wyścigi: ${priorities}`,
    workouts: count => `${count} treningi`,
    activities: count => `${count} aktywności`,
    notes: count => `${count} notatki`,
  };

  it('follows the day with every count it holds', () => {
    expect(
      formatDayLabel(
        'Poniedziałek, 5 października',
        { races: [], workouts: 2, activities: 3, notes: 4 },
        COUNTS,
      ),
    ).toBe('Poniedziałek, 5 października. 2 treningi, 3 aktywności, 4 notatki');
  });

  it('leaves the zero counts out', () => {
    expect(
      formatDayLabel(
        'Poniedziałek, 5 października',
        { races: [], workouts: 0, activities: 3, notes: 0 },
        COUNTS,
      ),
    ).toBe('Poniedziałek, 5 października. 3 aktywności');
  });

  it('puts a lone Race first, with its priority', () => {
    expect(
      formatDayLabel(
        'Czwartek, 12 listopada',
        { races: ['A'], workouts: 1, activities: 0, notes: 1 },
        COUNTS,
      ),
    ).toBe('Czwartek, 12 listopada. wyścig A, 1 treningi, 1 notatki');
  });

  it('counts several Races, then lists their priorities in order', () => {
    expect(
      formatDayLabel(
        'Sobota, 14 listopada',
        { races: ['A', 'C'], workouts: 0, activities: 2, notes: 0 },
        COUNTS,
      ),
    ).toBe('Sobota, 14 listopada. 2 wyścigi: A, C, 2 aktywności');
  });

  it('is just the day when it holds nothing', () => {
    expect(
      formatDayLabel(
        'Poniedziałek, 5 października',
        { races: [], workouts: 0, activities: 0, notes: 0 },
        COUNTS,
      ),
    ).toBe('Poniedziałek, 5 października');
  });
});
