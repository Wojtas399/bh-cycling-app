import type { IntervalsCalendarEvent } from '../intervalsApi';
import {
  type Race,
  compareRaces,
  nextRace,
  raceCountdown,
  toRace,
  toRaces,
} from '../races';

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

describe('compareRaces', () => {
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

describe('nextRace', () => {
  const TODAY = '2026-11-08';

  it('includes a Race today and one 30 days ahead, the window edges', () => {
    expect(nextRace([race({ id: 1, date: TODAY })], TODAY)).toMatchObject({
      id: 1,
    });
    expect(
      nextRace([race({ id: 2, date: '2026-12-08' })], TODAY),
    ).toMatchObject({ id: 2 });
  });

  it('leaves out a Race yesterday and one 31 days ahead', () => {
    expect(
      nextRace(
        [
          race({ id: 1, date: '2026-11-07' }),
          race({ id: 2, date: '2026-12-09' }),
        ],
        TODAY,
      ),
    ).toBeUndefined();
  });

  it('returns nothing without Races', () => {
    expect(nextRace([], TODAY)).toBeUndefined();
  });

  it('picks the nearest day over a higher priority further away', () => {
    expect(
      nextRace(
        [
          race({ id: 1, priority: 'A', date: '2026-11-20' }),
          race({ id: 2, priority: 'C', date: '2026-11-12' }),
          race({ id: 3, priority: 'B', date: '2026-11-15' }),
        ],
        TODAY,
      ),
    ).toMatchObject({ id: 2 });
  });

  it('breaks a tie on the nearest day by the Race order', () => {
    const day = '2026-11-12';

    expect(
      nextRace(
        [
          race({ id: 1, priority: 'C', date: day }),
          race({ id: 2, priority: 'B', date: day, startTime: '14:00' }),
          race({ id: 3, priority: 'B', date: day, startTime: '09:00' }),
          race({ id: 4, priority: 'A', date: '2026-11-13' }),
        ],
        TODAY,
      ),
    ).toMatchObject({ id: 3 });
  });
});

describe('raceCountdown', () => {
  const TODAY = '2026-11-08';

  it('is today for a Race today', () => {
    expect(raceCountdown(race({ date: TODAY }), TODAY)).toBe('today');
  });

  it('is tomorrow for a Race tomorrow', () => {
    expect(raceCountdown(race({ date: '2026-11-09' }), TODAY)).toBe('tomorrow');
  });

  it('is the number of whole calendar days for a Race further away', () => {
    expect(raceCountdown(race({ date: '2026-11-10' }), TODAY)).toBe(2);
    expect(raceCountdown(race({ date: '2026-12-08' }), TODAY)).toBe(30);
  });
});
