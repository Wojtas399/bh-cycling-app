import type { CalendarItem, UnplannedActivity } from '../calendarItems';
import {
  type CompactItemRowWords,
  compactItemRow,
  compactItemRowLabel,
} from '../compactItemRow';
import { formatSpokenDuration } from '../formatDuration';
import type { Race } from '../races';
import type { WorkoutBlock } from '../workoutProfile';
import type { CalendarWorkout } from '../workoutStatus';

const STRAVA_TITLE = 'Aktywność ze Stravy';

const BLOCKS: WorkoutBlock[] = [
  { widthFraction: 0.5, minPct: 55, maxPct: 55, zone: 1 },
  { widthFraction: 0.5, minPct: 90, maxPct: 90, zone: 3 },
];

function activity(overrides: Partial<UnplannedActivity> = {}): CalendarItem {
  return {
    kind: 'activity',
    activity: {
      id: 'a1',
      date: '2026-11-14',
      name: 'Dojazd do pracy',
      type: 'Ride',
      ...overrides,
    } as UnplannedActivity,
  };
}

function strava(overrides: Partial<UnplannedActivity> = {}): CalendarItem {
  return {
    kind: 'activity',
    activity: {
      id: 'a2',
      date: '2026-11-14',
      isStravaActivity: true,
      ...overrides,
    } as UnplannedActivity,
  };
}

function race(
  overrides: Partial<Race> = {},
  paired?: UnplannedActivity,
): CalendarItem {
  return {
    kind: 'race',
    race: {
      id: 7,
      name: 'Mazovia Maraton',
      priority: 'A',
      date: '2026-11-14',
      sport: 'Ride',
      ...overrides,
    },
    ...(paired && { activity: paired }),
  };
}

const RACED: UnplannedActivity = {
  id: 'raced',
  date: '2026-11-14',
  name: 'Mazovia Maraton',
  type: 'Ride',
  durationSeconds: 10920,
  load: 209.7,
};

function workout(overrides: Partial<CalendarWorkout> = {}): CalendarItem {
  return {
    kind: 'workout',
    workout: {
      id: 1,
      name: 'Sweet spot 3×12',
      date: '2026-11-14',
      status: 'planned',
      blocks: [],
      completedWithStravaActivity: false,
      ...overrides,
    },
  };
}

describe('compactItemRow', () => {
  describe('a Workout', () => {
    it('is its Workout Status, name, planned duration and Workout Profile', () => {
      expect(
        compactItemRow(
          workout({ durationSeconds: 4500, blocks: BLOCKS }),
          STRAVA_TITLE,
        ),
      ).toEqual({
        kind: 'workout',
        status: 'planned',
        title: 'Sweet spot 3×12',
        durationSeconds: 4500,
        blocks: BLOCKS,
      });
    });

    it.each(['completed', 'planned', 'missed'] as const)(
      'keeps a %s Workout Status',
      status => {
        expect(compactItemRow(workout({ status }), STRAVA_TITLE)).toEqual(
          expect.objectContaining({ kind: 'workout', status }),
        );
      },
    );

    it('leaves out the duration and draws no profile when it has neither', () => {
      const row = compactItemRow(workout(), STRAVA_TITLE);

      expect(row).not.toHaveProperty('durationSeconds');
      expect(row).toEqual(expect.objectContaining({ blocks: [] }));
    });

    it('never gets a load, even from a completed Workout carrying one', () => {
      const withLoad = {
        ...workout({ status: 'completed', durationSeconds: 3600 }),
      } as CalendarItem & { kind: 'workout' };
      const item = {
        ...withLoad,
        workout: { ...withLoad.workout, load: 80 },
      } as CalendarItem;

      expect(compactItemRow(item, STRAVA_TITLE)).not.toHaveProperty('load');
    });
  });

  describe('an Unplanned Activity', () => {
    it('is its name, duration and load, rounded', () => {
      expect(
        compactItemRow(
          activity({ durationSeconds: 3600, load: 25.6 }),
          STRAVA_TITLE,
        ),
      ).toEqual({
        kind: 'activity',
        title: 'Dojazd do pracy',
        durationSeconds: 3600,
        load: 26,
      });
    });

    it('is called by the Strava title when it is a Strava Activity', () => {
      expect(
        compactItemRow(strava({ durationSeconds: 1800 }), STRAVA_TITLE),
      ).toEqual({
        kind: 'activity',
        title: 'Aktywność ze Stravy',
        durationSeconds: 1800,
      });
    });

    it('leaves out the duration and load it does not have', () => {
      const row = compactItemRow(activity(), STRAVA_TITLE);

      expect(row).not.toHaveProperty('durationSeconds');
      expect(row).not.toHaveProperty('load');
    });
  });

  describe('a Race', () => {
    it.each(['A', 'B', 'C'] as const)(
      'is a %s Race, unpaired, with its name and planned duration',
      priority => {
        expect(
          compactItemRow(
            race({ priority, durationSeconds: 7200 }),
            STRAVA_TITLE,
          ),
        ).toEqual({
          kind: 'race',
          priority,
          paired: false,
          title: 'Mazovia Maraton',
          durationSeconds: 7200,
        });
      },
    );

    it('leaves out the planned duration an unpaired Race does not have', () => {
      expect(compactItemRow(race(), STRAVA_TITLE)).not.toHaveProperty(
        'durationSeconds',
      );
    });

    it("is paired, with the Activity's duration and rounded load instead of the plan", () => {
      expect(
        compactItemRow(race({ durationSeconds: 7200 }, RACED), STRAVA_TITLE),
      ).toEqual({
        kind: 'race',
        priority: 'A',
        paired: true,
        title: 'Mazovia Maraton',
        durationSeconds: 10920,
        load: 210,
      });
    });

    it("keeps its own name when paired, not the Activity's", () => {
      expect(
        compactItemRow(
          race({}, { ...RACED, name: 'Morning Ride' }),
          STRAVA_TITLE,
        ).title,
      ).toBe('Mazovia Maraton');
    });

    it("leaves out the figures a paired Race's Activity does not have, never falling back to the plan", () => {
      const row = compactItemRow(
        race(
          { durationSeconds: 7200 },
          { id: 'raced', date: '2026-11-14', isStravaActivity: true },
        ),
        STRAVA_TITLE,
      );

      expect(row).not.toHaveProperty('durationSeconds');
      expect(row).not.toHaveProperty('load');
    });
  });
});

describe('compactItemRowLabel', () => {
  const WORDS: CompactItemRowWords = {
    workout: status =>
      ({
        completed: 'Trening wykonany',
        planned: 'Trening zaplanowany',
        missed: 'Trening pominięty',
      })[status],
    activity: 'Aktywność',
    race: (priority, paired) =>
      paired ? `Wyścig ${priority} wykonany` : `Wyścig ${priority}`,
    duration: seconds =>
      formatSpokenDuration(seconds, {
        hours: hours => `${hours} godz.`,
        minutes: minutes => `${minutes} min`,
      }),
    load: load => `obciążenie ${load}`,
  };

  function label(item: CalendarItem): string {
    return compactItemRowLabel(compactItemRow(item, STRAVA_TITLE), WORDS);
  }

  it('reads a Workout as its status, then its title and duration', () => {
    expect(label(workout({ status: 'completed', durationSeconds: 4500 }))).toBe(
      'Trening wykonany, Sweet spot 3×12, 1 godz. 15 min',
    );
  });

  it.each([
    ['planned', 'Trening zaplanowany'],
    ['missed', 'Trening pominięty'],
  ] as const)('reads a %s Workout as "%s"', (status, phrase) => {
    expect(label(workout({ status }))).toBe(`${phrase}, Sweet spot 3×12`);
  });

  it('reads an Unplanned Activity as its kind, title, duration and load', () => {
    expect(label(strava({ durationSeconds: 3600, load: 26 }))).toBe(
      'Aktywność, Aktywność ze Stravy, 1 godz., obciążenie 26',
    );
  });

  it('leaves out the duration it does not have, keeping the load after the title', () => {
    expect(label(activity({ load: 12.4 }))).toBe(
      'Aktywność, Dojazd do pracy, obciążenie 12',
    );
  });

  it.each(['A', 'B', 'C'] as const)(
    'reads an unpaired %s Race as its priority and name',
    priority => {
      expect(label(race({ priority }))).toBe(
        `Wyścig ${priority}, Mazovia Maraton`,
      );
    },
  );

  it("reads an unpaired Race's planned duration when it has one", () => {
    expect(label(race({ priority: 'B', durationSeconds: 7200 }))).toBe(
      'Wyścig B, Mazovia Maraton, 2 godz.',
    );
  });

  it("reads a paired Race as done, with the Activity's duration and load", () => {
    expect(label(race({}, RACED))).toBe(
      'Wyścig A wykonany, Mazovia Maraton, 3 godz. 2 min, obciążenie 210',
    );
  });
});
