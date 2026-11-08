import type { RaceItem } from '../calendarItems';
import { formatRaceDate, raceTileLabel, raceTileMeta } from '../raceLabels';
import type { Race } from '../races';

function race(overrides: Partial<Race>): Race {
  return {
    id: 1,
    name: 'Gravel Race',
    priority: 'A',
    date: '2026-11-13',
    sport: 'Ride',
    ...overrides,
  };
}

function item(overrides: Partial<Race>): RaceItem {
  return { kind: 'race', race: race(overrides) };
}

describe('raceTileLabel', () => {
  const PARTS = { priority: 'Wyścig A', sport: 'Jazda rowerem' };

  it('reads an unpaired Race as its priority, name, sport and start time', () => {
    expect(raceTileLabel(item({ startTime: '09:05' }), PARTS)).toBe(
      'Wyścig A: Gravel Race, Jazda rowerem, 9:05',
    );
  });

  it('leaves out the start time of an all-day Race', () => {
    expect(
      raceTileLabel(item({}), { priority: 'Wyścig C', sport: 'Bieg' }),
    ).toBe('Wyścig C: Gravel Race, Bieg');
  });
});

describe('raceTileMeta', () => {
  it('lists the start time, planned duration and distance', () => {
    expect(
      raceTileMeta(
        race({
          startTime: '14:00',
          durationSeconds: 7200,
          distanceMeters: 50000,
        }),
        'Jazda rowerem',
      ),
    ).toBe('14:00 · 2h · 50,0 km');
  });

  it('lists only the figures that are set', () => {
    expect(raceTileMeta(race({ distanceMeters: 42195 }), 'Bieg')).toBe(
      '42,2 km',
    );
  });

  it('shows the sport when none is set', () => {
    expect(raceTileMeta(race({}), 'Bieg')).toBe('Bieg');
  });
});

describe('formatRaceDate', () => {
  const LABELS = {
    weekdaysShort: ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'],
    monthsShort: [
      'sty',
      'lut',
      'mar',
      'kwi',
      'maj',
      'cze',
      'lip',
      'sie',
      'wrz',
      'paź',
      'lis',
      'gru',
    ],
  };

  it('reads the date and the start time', () => {
    expect(formatRaceDate(race({ startTime: '09:05' }), LABELS)).toBe(
      'pt., 13 lis 2026 · 9:05',
    );
  });

  it('reads the date alone for an all-day Race', () => {
    expect(formatRaceDate(race({}), LABELS)).toBe('pt., 13 lis 2026');
  });
});
