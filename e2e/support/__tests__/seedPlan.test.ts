import { planSeed } from '../seedPlan';

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
    // Intervals.icu workout syntax: section titles, and steps written as
    // `- <minutes>m <%FTP or %FTP range>`, with blank lines between sections.
    const STEP = /^- \d+m \d+(-\d+)?%$/;
    const steps = (description: string) =>
      description.split('\n').filter(line => STEP.test(line));
    const { sweetSpot, endurance } = planSeed(new Date(2026, 10, 8)).events;

    it.each(Object.entries({ sweetSpot, endurance }))(
      '%s is written in Intervals.icu workout syntax',
      (_, workout) => {
        for (const line of workout.description.split('\n')) {
          if (line.startsWith('-')) expect(line).toMatch(STEP);
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
