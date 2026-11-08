import type { IntervalsCalendarEvent } from '../intervalsApi';
import { type Race, compareRaces, toRace, toRaces } from '../races';

// Shaped like the live Race bodies in #280.
function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'RACE_B',
    name: 'Gravel Race',
    start_date_local: '2026-11-13T00:00:00',
    end_date_local: '2026-11-14T00:00:00',
    type: 'Ride',
    color: '#ff2a0e',
    ...overrides,
  };
}

describe('toRaces', () => {
  it('keeps only RACE_A, RACE_B and RACE_C events, priority from the category', () => {
    expect(
      toRaces([
        event({ id: 1, category: 'RACE_A' }),
        event({ id: 2, category: 'WORKOUT' }),
        event({ id: 3, category: 'RACE_C' }),
        event({ id: 4, category: 'NOTE' }),
        event({ id: 5, category: 'RACE_B' }),
        event({ id: 6, category: 'TARGET' }),
      ]).map(({ id, priority }) => [id, priority]),
    ).toEqual([
      [1, 'A'],
      [3, 'C'],
      [5, 'B'],
    ]);
  });
});

describe('toRace', () => {
  it('maps a timed Race with every field set', () => {
    expect(
      toRace(
        event({
          id: 7,
          name: 'Test 2',
          start_date_local: '2026-11-13T14:00:00',
          end_date_local: '2026-11-13T16:00:00',
          moving_time: 7200,
          distance: 50000,
          description: 'Start z rynku.',
        }),
      ),
    ).toEqual({
      id: 7,
      name: 'Test 2',
      priority: 'B',
      date: '2026-11-13',
      startTime: '14:00',
      sport: 'Ride',
      durationSeconds: 7200,
      distanceMeters: 50000,
      description: 'Start z rynku.',
    });
  });

  it('leaves out the start time of an all-day Race and every field Intervals.icu has no value for', () => {
    expect(
      toRace(
        event({
          moving_time: undefined,
          distance: 0,
          description: null as unknown as undefined,
        }),
      ),
    ).toEqual({
      id: 1,
      name: 'Gravel Race',
      priority: 'B',
      date: '2026-11-13',
      sport: 'Ride',
    });
  });

  it('leaves out a whitespace-only description', () => {
    expect(toRace(event({ description: ' \n ' }))).not.toHaveProperty(
      'description',
    );
  });

  it('passes a non-cycling sport through', () => {
    expect(toRace(event({ type: 'Run' }))).toMatchObject({ sport: 'Run' });
  });

  it('ignores the Race colour and load', () => {
    const race = toRace(event({ icu_training_load: 120 }));

    expect(race).not.toHaveProperty('color');
    expect(race).not.toHaveProperty('load');
  });

  it('returns nothing for an event that is not a Race', () => {
    expect(toRace(event({ category: 'WORKOUT' }))).toBeUndefined();
  });
});

describe('compareRaces', () => {
  function race(overrides: Partial<Race>): Race {
    return {
      id: 1,
      name: 'Race',
      priority: 'B',
      date: '2026-11-13',
      sport: 'Ride',
      ...overrides,
    };
  }

  function order(races: Race[]): number[] {
    return [...races].sort(compareRaces).map(({ id }) => id);
  }

  it('puts A before B before C, whatever the start time or name', () => {
    expect(
      order([
        race({ id: 1, priority: 'C', startTime: '07:00', name: 'Alfa' }),
        race({ id: 2, priority: 'A', startTime: '15:00', name: 'Zeta' }),
        race({ id: 3, priority: 'B', startTime: '08:00', name: 'Beta' }),
      ]),
    ).toEqual([2, 3, 1]);
  });

  it('then the earliest start time, an all-day Race counting as midnight', () => {
    expect(
      order([
        race({ id: 1, startTime: '14:00' }),
        race({ id: 2, startTime: '09:30' }),
        race({ id: 3 }),
      ]),
    ).toEqual([3, 2, 1]);
  });

  it('then the name', () => {
    expect(
      order([
        race({ id: 1, name: 'Żyrardów' }),
        race({ id: 2, name: 'Łódź' }),
        race({ id: 3, name: 'Kraków' }),
      ]),
    ).toEqual([3, 2, 1]);
  });
});
