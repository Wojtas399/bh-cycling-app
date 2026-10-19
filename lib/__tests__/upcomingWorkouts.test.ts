import { calendarItemKey } from '../calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';
import { getUpcomingItems } from '../upcomingWorkouts';

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

const TODAY = '2026-07-25';
const ZONE_CONFIG = resolveZoneConfig();

function keysAndLabels(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
) {
  return getUpcomingItems(events, activities, TODAY, ZONE_CONFIG).map(item => [
    calendarItemKey(item),
    item.dayLabel,
  ]);
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

  it('returns an empty list when nothing matches', () => {
    expect(getUpcomingItems([], [], TODAY, ZONE_CONFIG)).toEqual([]);
  });
});
