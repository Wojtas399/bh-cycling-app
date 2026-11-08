/** A Workout the seed creates on the test athlete's Intervals.icu calendar. */
export interface SeedWorkout {
  external_id: string;
  name: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  type: 'Ride';
  description: string;
}

export interface SeedPlan {
  events: { sweetSpot: SeedWorkout; endurance: SeedWorkout };
  /** Inclusive local dates to clear seed-owned events from. */
  deleteWindow: { oldest: string; newest: string };
  /** Whether the seed owns an existing event and may delete it. */
  isSeedOwned: (event: { external_id?: string | null }) => boolean;
}

const SEED_PREFIX = 'e2e-';

// Intervals.icu workout syntax, so the events come back with
// `workout_doc.steps` and Workout Details can draw a Workout Profile.
const SWEET_SPOT_DESCRIPTION = [
  'Warmup',
  '- 10m 50-65%',
  '',
  'Sweet spot',
  '- 30m 88-93%',
  '',
  'Cooldown',
  '- 10m 50%',
].join('\n');
const ENDURANCE_DESCRIPTION = ['Endurance', '- 90m 60-70%'].join('\n');

/** What the seed should leave on the calendar, given the Mac's "today". */
export function planSeed(today: Date): SeedPlan {
  const year = today.getFullYear();
  const month = today.getMonth();

  return {
    events: {
      sweetSpot: {
        external_id: `${SEED_PREFIX}today`,
        name: 'E2E Sweet Spot',
        date: toLocalDate(today),
        type: 'Ride',
        description: SWEET_SPOT_DESCRIPTION,
      },
      endurance: {
        external_id: `${SEED_PREFIX}next-month`,
        name: 'E2E Endurance',
        date: toLocalDate(new Date(year, month + 1, 15)),
        type: 'Ride',
        description: ENDURANCE_DESCRIPTION,
      },
    },
    deleteWindow: {
      oldest: toLocalDate(new Date(year, month - 1, 1)),
      // Day 0 of a month is the last day of the month before it.
      newest: toLocalDate(new Date(year, month + 3, 0)),
    },
    isSeedOwned: event => event.external_id?.startsWith(SEED_PREFIX) ?? false,
  };
}

function toLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
