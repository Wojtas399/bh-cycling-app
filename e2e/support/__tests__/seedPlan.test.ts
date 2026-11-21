import { planSeed, rideTcx } from '../seedPlan';

describe('planSeed', () => {
  it('plans E2E Sweet Spot today and E2E Endurance on the 15th of next month', () => {
    const { events } = planSeed(new Date(2026, 10, 8, 14, 30));

    expect(events.sweetSpot).toMatchObject({
      external_id: 'e2e-today',
      name: 'E2E Sweet Spot',
      date: '2026-11-08',
      type: 'Ride',
    });
    expect(events.endurance).toMatchObject({
      external_id: 'e2e-next-month',
      name: 'E2E Endurance',
      date: '2026-12-15',
      type: 'Ride',
    });
  });

  it('plans E2E Goal Race, an A Race run, for tomorrow', () => {
    const { race } = planSeed(new Date(2026, 10, 8, 14, 30)).events;

    expect(race).toEqual({
      category: 'RACE_A',
      external_id: 'e2e-tomorrow-race',
      name: 'E2E Goal Race',
      date: '2026-11-09',
      day: new Date(2026, 10, 9),
      type: 'Run',
    });
  });

  it('plans E2E Briefing, a Note with text, for today', () => {
    const { note } = planSeed(new Date(2026, 10, 8, 14, 30)).events;

    expect(note).toEqual({
      category: 'NOTE',
      external_id: 'e2e-today-note',
      name: 'E2E Briefing',
      date: '2026-11-08',
      day: new Date(2026, 10, 8),
      description: 'Bring a spare tube and two bottles.',
    });
  });

  it.each([
    ['the last day of a 31-day month', new Date(2027, 0, 31), '2027-02-01'],
    ['the last day of February', new Date(2027, 1, 28), '2027-03-01'],
    ['31 December', new Date(2026, 11, 31), '2027-01-01'],
  ])('on %s, dates E2E Goal Race in the next month', (_, today, raceDate) => {
    expect(planSeed(today).events.race.date).toBe(raceDate);
  });

  it('gives each Workout its local day as a Date, so a test needs no date parsing', () => {
    const { events } = planSeed(new Date(2026, 11, 31, 23, 59));

    expect(events.sweetSpot.day).toEqual(new Date(2026, 11, 31));
    expect(events.endurance.day).toEqual(new Date(2027, 0, 15));
  });

  it.each([
    [
      'the last day of a 31-day month',
      new Date(2027, 0, 31),
      '2027-01-31',
      '2027-02-15',
    ],
    [
      'the last day of February',
      new Date(2027, 1, 28),
      '2027-02-28',
      '2027-03-15',
    ],
    ['31 December', new Date(2026, 11, 31), '2026-12-31', '2027-01-15'],
    ['the 15th', new Date(2026, 10, 15), '2026-11-15', '2026-12-15'],
  ])(
    'on %s, dates today and the 15th of next month',
    (_, today, sweetSpotDate, enduranceDate) => {
      const { events } = planSeed(today);

      expect(events.sweetSpot.date).toBe(sweetSpotDate);
      expect(events.endurance.date).toBe(enduranceDate);
    },
  );

  it.each([
    ['mid-month', new Date(2026, 10, 8), '2026-10-01', '2027-01-31'],
    ['in January', new Date(2027, 0, 31), '2026-12-01', '2027-03-31'],
    ['in December', new Date(2026, 11, 31), '2026-11-01', '2027-02-28'],
    [
      'ahead of a leap-year February',
      new Date(2027, 11, 1),
      '2027-11-01',
      '2028-02-29',
    ],
  ])(
    '%s, deletes from the start of last month to the end of the month after next',
    (_, today, oldest, newest) => {
      expect(planSeed(today).deleteWindow).toEqual({ oldest, newest });
    },
  );

  it('plans every Workout inside the delete window, so a second run replaces it', () => {
    for (const today of [new Date(2026, 10, 8), new Date(2026, 11, 31)]) {
      const { events, deleteWindow } = planSeed(today);

      for (const workout of Object.values(events)) {
        expect(workout.date >= deleteWindow.oldest).toBe(true);
        expect(workout.date <= deleteWindow.newest).toBe(true);
      }
    }
  });

  describe('descriptions', () => {
    const WORKOUT_SYNTAX_MINUTES_AT_FTP_PERCENT_STEP = /^- \d+m \d+(-\d+)?%$/;
    const steps = (description: string) =>
      description
        .split('\n')
        .filter(line => WORKOUT_SYNTAX_MINUTES_AT_FTP_PERCENT_STEP.test(line));
    const { sweetSpot, endurance } = planSeed(new Date(2026, 10, 8)).events;

    it.each(Object.entries({ sweetSpot, endurance }))(
      '%s is written in Intervals.icu workout syntax',
      (_, workout) => {
        for (const line of workout.description.split('\n')) {
          if (line.startsWith('-')) {
            expect(line).toMatch(WORKOUT_SYNTAX_MINUTES_AT_FTP_PERCENT_STEP);
          }
        }

        expect(steps(workout.description).length).toBeGreaterThan(0);
      },
    );

    it('gives E2E Sweet Spot at least three steps, so Workout Details draws a Workout Profile', () => {
      expect(steps(sweetSpot.description).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isSeedOwned', () => {
    const { isSeedOwned } = planSeed(new Date(2026, 10, 8));

    it.each(['e2e-today', 'e2e-next-month', 'e2e-check'])(
      'owns an event with external_id %s',
      externalId => {
        expect(isSeedOwned({ external_id: externalId })).toBe(true);
      },
    );

    it.each(['zwift-123', 'trainingpeaks-e2e-1', 'E2E-today', 'e2e', ''])(
      'leaves an event with external_id %j alone',
      externalId => {
        expect(isSeedOwned({ external_id: externalId })).toBe(false);
      },
    );

    it('leaves an event without an external_id alone', () => {
      expect(isSeedOwned({})).toBe(false);
      expect(isSeedOwned({ external_id: null })).toBe(false);
    });

    it('owns every Workout it plans', () => {
      for (const workout of Object.values(planSeed(new Date()).events)) {
        expect(isSeedOwned(workout)).toBe(true);
      }
    });
  });
});

function trackpoints(tcx: string): { time: string; watts: number }[] {
  return [...tcx.matchAll(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/g)].map(
    ([, body]) => ({
      time: /<Time>(.*?)<\/Time>/.exec(body)?.[1] ?? '',
      watts: Number(/<ns3:Watts>(.*?)<\/ns3:Watts>/.exec(body)?.[1]),
    }),
  );
}

describe('rideTcx', () => {
  const start = new Date(Date.UTC(2026, 10, 8, 11, 0, 0));

  it('writes a ride with a power sample every second, effort after effort', () => {
    const points = trackpoints(
      rideTcx(start, [
        { seconds: 2, watts: 120 },
        { seconds: 3, watts: 250 },
      ]),
    );

    expect(points).toEqual([
      { time: '2026-11-08T11:00:00.000Z', watts: 120 },
      { time: '2026-11-08T11:00:01.000Z', watts: 120 },
      { time: '2026-11-08T11:00:02.000Z', watts: 250 },
      { time: '2026-11-08T11:00:03.000Z', watts: 250 },
      { time: '2026-11-08T11:00:04.000Z', watts: 250 },
    ]);
  });

  it('is a TCX bike ride starting at `start`, so Intervals.icu reads it as a Ride', () => {
    const tcx = rideTcx(start, [{ seconds: 60, watts: 200 }]);

    expect(tcx).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(tcx).toContain(
      'xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"',
    );
    expect(tcx).toContain('<Activity Sport="Biking">');
    expect(tcx).toContain('<Id>2026-11-08T11:00:00.000Z</Id>');
    expect(tcx).toContain('<Lap StartTime="2026-11-08T11:00:00.000Z">');
    expect(tcx).toContain('<TotalTimeSeconds>60</TotalTimeSeconds>');
  });
});

describe('planSeed ride', () => {
  const today = new Date(2026, 10, 8, 14, 30);
  const { ride, deleteWindow, isSeedOwned } = planSeed(today);

  it('plans E2E Ride today, owned by the seed', () => {
    expect(ride).toMatchObject({
      external_id: 'e2e-ride',
      name: 'E2E Ride',
      date: '2026-11-08',
      day: new Date(2026, 10, 8),
    });
    expect(isSeedOwned(ride)).toBe(true);
    expect(ride.date >= deleteWindow.oldest).toBe(true);
    expect(ride.date <= deleteWindow.newest).toBe(true);
  });

  it('starts the ride at local noon, so it stays on today in any nearby time zone', () => {
    expect(trackpoints(ride.tcx)[0].time).toBe(
      new Date(2026, 10, 8, 12, 0, 0).toISOString(),
    );
  });

  it('rides a short ride through several zones, with power throughout', () => {
    const points = trackpoints(ride.tcx);
    const watts = new Set(points.map(point => point.watts));

    expect(points.length).toBeGreaterThanOrEqual(10 * 60);
    expect(points.length).toBeLessThanOrEqual(30 * 60);
    expect(watts.size).toBeGreaterThanOrEqual(3);
    expect(points.every(point => point.watts > 0)).toBe(true);
  });
});
