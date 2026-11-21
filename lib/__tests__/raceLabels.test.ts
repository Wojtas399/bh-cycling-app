import type { RaceItem } from '../calendarItems';
import {
  formatRaceDate,
  raceItemMeta,
  raceTileLabel,
  raceTileMeta,
} from '../raceLabels';
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
  const PARTS = {
    priority: 'Wyścig A',
    sport: 'Jazda rowerem',
    completed: 'ukończony',
  };

  it('reads an unpaired Race as its priority, name, sport and start time', () => {
    expect(raceTileLabel(item({ startTime: '09:05' }), PARTS)).toBe(
      'Wyścig A: Gravel Race, Jazda rowerem, 9:05',
    );
  });

  it('leaves out the start time of an all-day Race', () => {
    expect(
      raceTileLabel(item({}), {
        ...PARTS,
        priority: 'Wyścig C',
        sport: 'Bieg',
      }),
    ).toBe('Wyścig C: Gravel Race, Bieg');
  });

  it("reads a paired Race as completed, with the Activity's recorded figures instead of the start time and plan", () => {
    const paired: RaceItem = {
      ...item({
        startTime: '09:05',
        durationSeconds: 7200,
        distanceMeters: 50000,
      }),
      activity: {
        id: 'raced',
        name: 'Gravel Race',
        type: 'Ride',
        date: '2026-11-13',
        durationSeconds: 6900,
        distanceMeters: 51234,
      },
    };

    expect(raceTileLabel(paired, PARTS)).toBe(
      'Wyścig A: Gravel Race, Jazda rowerem, ukończony, 1h 55m, 51,2 km',
    );
  });

  it('reads only the recorded figures a paired Race has', () => {
    const paired: RaceItem = {
      ...item({ distanceMeters: 50000 }),
      activity: {
        id: 'raced',
        name: 'Gravel Race',
        type: 'Ride',
        date: '2026-11-13',
        durationSeconds: 3600,
      },
    };

    expect(raceTileLabel(paired, PARTS)).toBe(
      'Wyścig A: Gravel Race, Jazda rowerem, ukończony, 1h',
    );
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

describe('raceItemMeta', () => {
  it("shows an unpaired Race's start time and plan", () => {
    expect(
      raceItemMeta(item({ startTime: '14:00', durationSeconds: 7200 }), 'Bieg'),
    ).toBe('14:00 · 2h');
  });

  it("shows a paired Race's recorded duration and distance in place of its start time and plan", () => {
    expect(
      raceItemMeta(
        {
          ...item({
            startTime: '14:00',
            durationSeconds: 7200,
            distanceMeters: 50000,
          }),
          activity: {
            id: 'raced',
            name: 'Gravel Race',
            type: 'Ride',
            date: '2026-11-13',
            durationSeconds: 6900,
            distanceMeters: 51234,
          },
        },
        'Jazda rowerem',
      ),
    ).toBe('1h 55m · 51,2 km');
  });

  it('shows the sport for a paired Race with no recorded figures', () => {
    expect(
      raceItemMeta(
        {
          ...item({ startTime: '14:00', durationSeconds: 7200 }),
          activity: {
            id: 'raced',
            name: 'Gravel Race',
            type: 'Ride',
            date: '2026-11-13',
          },
        },
        'Bieg',
      ),
    ).toBe('Bieg');
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

  it('reads the date and the start time, its hour unpadded like every other time in the app', () => {
    expect(formatRaceDate(race({ startTime: '09:05' }), LABELS)).toBe(
      'pt., 13 lis 2026 · 9:05',
    );
  });

  it('reads the date alone for an all-day Race', () => {
    expect(formatRaceDate(race({}), LABELS)).toBe('pt., 13 lis 2026');
  });
});
