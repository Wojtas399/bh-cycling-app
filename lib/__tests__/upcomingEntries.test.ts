import type { IntervalsCalendarEvent } from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';
import { getUpcomingEntries } from '../upcomingEntries';

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

const NOW = new Date(2026, 6, 25, 10, 0, 0); // 2026-07-25, local
const ZONE_CONFIG = resolveZoneConfig();

describe('getUpcomingEntries', () => {
  it('excludes categories other than WORKOUT and NOTE', () => {
    const events = [
      event({ id: 1, category: 'RACE', name: 'Race day' }),
      event({ id: 2, category: 'WORKOUT', name: 'Intervals' }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result).toEqual([
      {
        kind: 'workout',
        id: 2,
        name: 'Intervals',
        dayLabel: 'today',
        blocks: [],
      },
    ]);
  });

  it('includes events scheduled for today and tomorrow', () => {
    const events = [
      event({
        id: 1,
        name: 'Today ride',
        start_date_local: '2026-07-25T08:00:00',
      }),
      event({
        id: 2,
        name: 'Tomorrow ride',
        start_date_local: '2026-07-26T08:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result).toEqual([
      {
        kind: 'workout',
        id: 1,
        name: 'Today ride',
        dayLabel: 'today',
        blocks: [],
      },
      {
        kind: 'workout',
        id: 2,
        name: 'Tomorrow ride',
        dayLabel: 'tomorrow',
        blocks: [],
      },
    ]);
  });

  it('excludes events outside the today/tomorrow window', () => {
    const events = [
      event({
        id: 1,
        name: 'Yesterday ride',
        start_date_local: '2026-07-24T08:00:00',
      }),
      event({
        id: 2,
        name: 'Day after tomorrow ride',
        start_date_local: '2026-07-27T08:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result).toEqual([]);
  });

  it('labels events correctly as today or tomorrow', () => {
    const events = [
      event({
        id: 1,
        name: 'Morning ride',
        start_date_local: '2026-07-25T06:00:00',
      }),
      event({
        id: 2,
        name: 'Evening ride',
        start_date_local: '2026-07-26T20:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result.find(e => e.id === 1)?.dayLabel).toBe('today');
    expect(result.find(e => e.id === 2)?.dayLabel).toBe('tomorrow');
  });

  it('sorts results chronologically', () => {
    const events = [
      event({
        id: 1,
        name: 'Later today',
        start_date_local: '2026-07-25T18:00:00',
      }),
      event({
        id: 2,
        name: 'Tomorrow morning',
        start_date_local: '2026-07-26T07:00:00',
      }),
      event({
        id: 3,
        name: 'Earlier today',
        start_date_local: '2026-07-25T06:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result.map(e => e.id)).toEqual([3, 1, 2]);
  });

  it('returns an empty list when nothing matches', () => {
    const result = getUpcomingEntries([], NOW, ZONE_CONFIG);

    expect(result).toEqual([]);
  });

  it('attaches durationSeconds from the workout_doc when present', () => {
    const events = [
      event({
        id: 1,
        name: 'Structured ride',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: { duration: 3600 },
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result[0].kind).toBe('workout');
    expect(result[0].kind === 'workout' && result[0].durationSeconds).toBe(
      3600,
    );
  });

  it('maps workouts lacking a workout_doc without a duration', () => {
    const events = [
      event({
        id: 1,
        name: 'Unstructured ride',
        start_date_local: '2026-07-25T08:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(
      result[0].kind === 'workout' && result[0].durationSeconds,
    ).toBeUndefined();
  });

  it('attaches the blocks of the workout profile when the doc carries steps', () => {
    const events = [
      event({
        id: 1,
        name: 'Threshold intervals',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: {
          duration: 1800,
          steps: [
            { duration: 600, power: { units: '%ftp', value: 50 } },
            { duration: 600, power: { units: '%ftp', start: 95, end: 105 } },
            { duration: 600, power: { units: 'power_zone', value: 2 } },
          ],
        },
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result[0].kind === 'workout' && result[0].blocks).toEqual([
      { widthFraction: 1 / 3, minPct: 50, maxPct: 50, zone: 1 },
      { widthFraction: 1 / 3, minPct: 95, maxPct: 105, zone: 4 },
      { widthFraction: 1 / 3, minPct: 55, maxPct: 75, zone: 2 },
    ]);
  });

  it('builds the blocks against the zone config it is given', () => {
    const events = [
      event({
        id: 1,
        name: 'Zone 2 ride',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: {
          duration: 3600,
          steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
        },
      }),
    ];

    const customConfig = resolveZoneConfig({ powerZones: [60, 80, 95] });

    const result = getUpcomingEntries(events, NOW, customConfig);

    expect(result[0].kind === 'workout' && result[0].blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
  });

  it('maps a workout whose steps are not drawable with an empty profile', () => {
    const events = [
      event({
        id: 1,
        name: 'Free ride',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: { duration: 3600, steps: [{ duration: 3600 }] },
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result[0].kind === 'workout' && result[0].name).toBe('Free ride');
    expect(result[0].kind === 'workout' && result[0].durationSeconds).toBe(
      3600,
    );
    expect(result[0].kind === 'workout' && result[0].blocks).toEqual([]);
  });

  it('maps a workout with no steps at all with an empty profile', () => {
    const events = [
      event({
        id: 1,
        name: 'Unstructured ride',
        start_date_local: '2026-07-25T08:00:00',
        workout_doc: { duration: 3600 },
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result[0].kind === 'workout' && result[0].blocks).toEqual([]);
  });

  it('maps a NOTE event into a note entry carrying its title and text', () => {
    const events = [
      event({
        id: 1,
        category: 'NOTE',
        name: 'Nutrition plan',
        start_date_local: '2026-07-25T00:00:00',
        description: '! HEADER !\n- bullet one',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result).toEqual([
      {
        kind: 'note',
        id: 1,
        title: 'Nutrition plan',
        text: '! HEADER !\n- bullet one',
        dayLabel: 'today',
      },
    ]);
  });

  it('defaults a note with no description to empty text', () => {
    const events = [
      event({
        id: 1,
        category: 'NOTE',
        name: 'Empty note',
        start_date_local: '2026-07-25T00:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result[0].kind === 'note' && result[0].text).toBe('');
  });

  it('represents a note-only day as a standalone note entry', () => {
    const events = [
      event({
        id: 1,
        category: 'NOTE',
        name: 'Tomorrow note',
        start_date_local: '2026-07-26T00:00:00',
        description: 'Pack rain jacket.',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result).toEqual([
      {
        kind: 'note',
        id: 1,
        title: 'Tomorrow note',
        text: 'Pack rain jacket.',
        dayLabel: 'tomorrow',
      },
    ]);
  });

  it('keeps multiple same-day notes as separate entries', () => {
    const events = [
      event({
        id: 1,
        category: 'NOTE',
        name: 'First note',
        start_date_local: '2026-07-25T00:00:00',
        description: 'A',
      }),
      event({
        id: 2,
        category: 'NOTE',
        name: 'Second note',
        start_date_local: '2026-07-25T00:00:00',
        description: 'B',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result.map(e => e.id)).toEqual([1, 2]);
  });

  it('sorts a same-day workout before a note regardless of raw timestamps', () => {
    const events = [
      event({
        id: 1,
        category: 'NOTE',
        name: 'Note',
        start_date_local: '2026-07-25T00:00:00',
        description: 'Note text',
      }),
      event({
        id: 2,
        category: 'WORKOUT',
        name: 'Workout',
        start_date_local: '2026-07-25T18:00:00',
      }),
    ];

    const result = getUpcomingEntries(events, NOW, ZONE_CONFIG);

    expect(result.map(e => e.id)).toEqual([2, 1]);
  });
});
