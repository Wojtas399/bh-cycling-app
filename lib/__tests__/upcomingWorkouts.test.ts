import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import type { Note } from '../notes';
import { resolveZoneConfig } from '../powerZones';
import { getUpcomingItems, upcomingItemKey } from '../upcomingWorkouts';

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-07-25T08:00:00',
    ...overrides,
  };
}

function activity(overrides: Partial<IntervalsActivity>): IntervalsActivity {
  return {
    id: 'a1',
    name: 'Zwift',
    type: 'VirtualRide',
    start_date_local: '2026-07-25T07:00:00',
    moving_time: 1620,
    distance: 14000,
    ...overrides,
  };
}

function note(overrides: Partial<Note>): Note {
  return {
    id: 1,
    name: 'Wolne',
    description: null,
    color: null,
    start: '2026-07-25',
    end: '2026-07-26',
    ...overrides,
  };
}

const TODAY = '2026-07-25';
const ZONE_CONFIG = resolveZoneConfig();

function keysAndLabels(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  notes: Note[] = [],
) {
  return getUpcomingItems(events, activities, notes, TODAY, ZONE_CONFIG).map(
    item => [upcomingItemKey(item), item.dayLabel],
  );
}

describe('getUpcomingItems', () => {
  it("lists today's and tomorrow's Workouts in order, labelled by day", () => {
    expect(
      keysAndLabels(
        [
          event({ id: 1, start_date_local: '2026-07-26T07:00:00' }),
          event({ id: 2, start_date_local: '2026-07-25T18:00:00' }),
          event({ id: 3, start_date_local: '2026-07-25T06:00:00' }),
          event({ id: 4, start_date_local: '2026-07-24T08:00:00' }),
          event({ id: 5, start_date_local: '2026-07-27T08:00:00' }),
        ],
        [],
      ),
    ).toEqual([
      ['workout-3', 'today'],
      ['workout-2', 'today'],
      ['workout-1', 'tomorrow'],
    ]);
  });

  it("lists today's Unplanned Activities among today's Workouts", () => {
    expect(
      keysAndLabels(
        [event({ id: 1, start_date_local: '2026-07-25T08:00:00' })],
        [
          activity({ id: 'zwift', start_date_local: '2026-07-25T07:00:00' }),
          activity({
            id: 'yesterday',
            start_date_local: '2026-07-24T07:00:00',
          }),
        ],
      ),
    ).toEqual([
      ['activity-zwift', 'today'],
      ['workout-1', 'today'],
    ]);
  });

  it('gives each Workout its Workout Status as of today', () => {
    const items = getUpcomingItems(
      [
        event({ id: 1, start_date_local: '2026-07-25T08:00:00' }),
        event({ id: 2, start_date_local: '2026-07-25T09:00:00' }),
      ],
      [
        activity({
          paired_event_id: 1,
          start_date_local: '2026-07-25T08:05:00',
        }),
      ],
      [],
      TODAY,
      ZONE_CONFIG,
    );

    expect(items).toMatchObject([
      { kind: 'workout', workout: { id: 1, status: 'completed' } },
      { kind: 'workout', workout: { id: 2, status: 'planned' } },
    ]);
  });

  it('shows a Workout ridden early on today, not tomorrow', () => {
    expect(
      keysAndLabels(
        [event({ id: 1, start_date_local: '2026-07-26T08:00:00' })],
        [
          activity({
            paired_event_id: 1,
            start_date_local: '2026-07-25T07:00:00',
          }),
        ],
      ),
    ).toEqual([['workout-1', 'today']]);
  });

  it('leaves out a Workout planned today but ridden yesterday', () => {
    expect(
      keysAndLabels(
        [event({ id: 1, start_date_local: '2026-07-25T08:00:00' })],
        [
          activity({
            paired_event_id: 1,
            start_date_local: '2026-07-24T07:00:00',
          }),
        ],
      ),
    ).toEqual([]);
  });

  it('shows a Workout planned yesterday but ridden today on today', () => {
    expect(
      keysAndLabels(
        [event({ id: 1, start_date_local: '2026-07-24T08:00:00' })],
        [
          activity({
            paired_event_id: 1,
            start_date_local: '2026-07-25T07:00:00',
          }),
        ],
      ),
    ).toEqual([['workout-1', 'today']]);
  });

  it('holds only Workouts tomorrow', () => {
    expect(
      keysAndLabels(
        [],
        [activity({ id: 'odd', start_date_local: '2026-07-26T07:00:00' })],
      ),
    ).toEqual([]);
  });

  describe('Races', () => {
    it("lists today's and tomorrow's Races first on their day, in Race order, before Workouts, Activities and Notes", () => {
      expect(
        keysAndLabels(
          [
            event({ id: 1, start_date_local: '2026-07-25T06:00:00' }),
            event({
              id: 2,
              category: 'RACE_C',
              start_date_local: '2026-07-25T09:00:00',
            }),
            event({
              id: 3,
              category: 'RACE_A',
              start_date_local: '2026-07-25T11:00:00',
            }),
            event({
              id: 4,
              category: 'RACE_B',
              start_date_local: '2026-07-26T00:00:00',
            }),
            event({ id: 5, start_date_local: '2026-07-26T07:00:00' }),
          ],
          [activity({ id: 'zwift', start_date_local: '2026-07-25T05:00:00' })],
          [note({ id: 10, start: '2026-07-25', end: '2026-07-26' })],
        ),
      ).toEqual([
        ['race-3', 'today'],
        ['race-2', 'today'],
        ['activity-zwift', 'today'],
        ['workout-1', 'today'],
        ['note-10', 'today'],
        ['race-4', 'tomorrow'],
        ['workout-5', 'tomorrow'],
      ]);
    });

    it('leaves out Races from yesterday and after tomorrow', () => {
      expect(
        keysAndLabels(
          [
            event({
              id: 1,
              category: 'RACE_A',
              start_date_local: '2026-07-24T00:00:00',
            }),
            event({
              id: 2,
              category: 'RACE_A',
              start_date_local: '2026-07-27T00:00:00',
            }),
          ],
          [],
        ),
      ).toEqual([]);
    });

    it('carries the Race with no Workout Status', () => {
      expect(
        getUpcomingItems(
          [
            event({
              id: 3,
              category: 'RACE_B',
              name: 'Bieg Niepodległości',
              start_date_local: '2026-07-25T10:00:00',
              type: 'Run',
            }),
          ],
          [],
          [],
          TODAY,
          ZONE_CONFIG,
        ),
      ).toEqual([
        {
          kind: 'race',
          race: {
            id: 3,
            name: 'Bieg Niepodległości',
            priority: 'B',
            date: '2026-07-25',
            startTime: '10:00',
            sport: 'Run',
          },
          dayLabel: 'today',
        },
      ]);
    });
  });

  it('returns an empty list when nothing matches', () => {
    expect(getUpcomingItems([], [], [], TODAY, ZONE_CONFIG)).toEqual([]);
  });

  describe('Notes', () => {
    it("lists today's and tomorrow's Notes after each day's items", () => {
      expect(
        keysAndLabels(
          [
            event({ id: 1, start_date_local: '2026-07-25T08:00:00' }),
            event({ id: 2, start_date_local: '2026-07-26T08:00:00' }),
          ],
          [activity({ id: 'zwift', start_date_local: '2026-07-25T07:00:00' })],
          [
            note({ id: 10, start: '2026-07-25', end: '2026-07-26' }),
            note({ id: 11, start: '2026-07-26', end: '2026-07-27' }),
          ],
        ),
      ).toEqual([
        ['activity-zwift', 'today'],
        ['workout-1', 'today'],
        ['note-10', 'today'],
        ['workout-2', 'tomorrow'],
        ['note-11', 'tomorrow'],
      ]);
    });

    it('shows a Note that started earlier and still covers today under today', () => {
      expect(
        keysAndLabels(
          [],
          [],
          [note({ id: 5, start: '2026-07-20', end: '2026-07-26' })],
        ),
      ).toEqual([['note-5', 'today']]);
    });

    it('shows a Note covering today and tomorrow once, under today', () => {
      expect(
        keysAndLabels(
          [],
          [],
          [note({ id: 5, start: '2026-07-25', end: '2026-07-28' })],
        ),
      ).toEqual([['note-5', 'today']]);
    });

    it('lists several Notes of a day in id order', () => {
      expect(
        keysAndLabels(
          [],
          [],
          [
            note({ id: 1, start: '2026-07-20', end: '2026-07-26' }),
            note({ id: 2, start: '2026-07-25', end: '2026-07-26' }),
            note({ id: 3, start: '2026-07-26', end: '2026-07-27' }),
            note({ id: 4, start: '2026-07-26', end: '2026-07-28' }),
          ],
        ),
      ).toEqual([
        ['note-1', 'today'],
        ['note-2', 'today'],
        ['note-3', 'tomorrow'],
        ['note-4', 'tomorrow'],
      ]);
    });

    it('leaves out a Note that ended yesterday or starts later', () => {
      expect(
        keysAndLabels(
          [],
          [],
          [
            note({ id: 1, start: '2026-07-24', end: '2026-07-25' }),
            note({ id: 2, start: '2026-07-27', end: '2026-07-28' }),
          ],
        ),
      ).toEqual([]);
    });

    it('carries the Note itself', () => {
      const wolne = note({ id: 9 });

      expect(getUpcomingItems([], [], [wolne], TODAY, ZONE_CONFIG)).toEqual([
        { kind: 'note', note: wolne, dayLabel: 'today' },
      ]);
    });
  });
});
