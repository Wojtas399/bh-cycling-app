import { dayCounts } from '../calendarDayCounts';
import type { CalendarItem } from '../calendarItems';
import type { CalendarData } from '../calendarWorkouts';
import type { Note } from '../notes';

function workout(id: number, date: string): CalendarItem {
  return {
    kind: 'workout',
    workout: { id, name: `Workout ${id}`, date, status: 'planned', blocks: [] },
  };
}

function activity(id: string, date: string): CalendarItem {
  return {
    kind: 'activity',
    activity: { id, name: `Activity ${id}`, type: 'Ride', date },
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
      workouts: 2,
      activities: 1,
      notes: 1,
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
      workouts: 0,
      activities: 0,
      notes: 4,
    });
  });

  it('counts zero for a day with nothing on it', () => {
    expect(dayCounts({ itemsByDate: {}, notes: [] }, '2026-10-07')).toEqual({
      workouts: 0,
      activities: 0,
      notes: 0,
    });
  });
});
