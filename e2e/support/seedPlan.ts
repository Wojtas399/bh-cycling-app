/** An event the seed creates on the test athlete's Intervals.icu calendar. */
interface SeedEventBase {
  external_id: string;
  name: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** The same local day, at midnight. */
  day: Date;
}

export interface SeedWorkout extends SeedEventBase {
  category: 'WORKOUT';
  type: 'Ride';
  description: string;
}

/** An all-day Race with no description, duration or distance. */
export interface SeedRace extends SeedEventBase {
  category: 'RACE_A';
  type: 'Run';
}

/**
 * A ride the seed uploads as an Unplanned Activity, so Activity Details has a
 * power stream to draw.
 */
export interface SeedRide {
  external_id: string;
  name: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** The same local day, at midnight. */
  day: Date;
  /** The ride as a TCX file. */
  tcx: string;
}

/** A stretch of the ride at one power. */
export interface RideEffort {
  seconds: number;
  watts: number;
}

export interface SeedPlan {
  events: { sweetSpot: SeedWorkout; endurance: SeedWorkout; race: SeedRace };
  ride: SeedRide;
  /** Inclusive local dates to clear seed-owned events and Activities from. */
  deleteWindow: { oldest: string; newest: string };
  /** Whether the seed owns an existing event or Activity and may delete it. */
  isSeedOwned: (item: { external_id?: string | null }) => boolean;
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

// 18 minutes from Z1 to Z6 at the test athlete's FTP, so Activity Details has
// several time-in-zone rows.
const RIDE_EFFORTS: RideEffort[] = [
  { seconds: 4 * 60, watts: 120 },
  { seconds: 4 * 60, watts: 170 },
  { seconds: 3 * 60, watts: 240 },
  { seconds: 2 * 60, watts: 320 },
  { seconds: 5 * 60, watts: 130 },
];

/** What the seed should leave on the calendar, given the Mac's "today". */
export function planSeed(today: Date): SeedPlan {
  const year = today.getFullYear();
  const month = today.getMonth();
  const sweetSpotDay = new Date(year, month, today.getDate());
  const enduranceDay = new Date(year, month + 1, 15);
  const raceDay = new Date(year, month, today.getDate() + 1);
  // Noon keeps the ride on today wherever Intervals.icu places the athlete
  // within 12 hours of the Mac.
  const rideStart = new Date(year, month, today.getDate(), 12);

  return {
    events: {
      sweetSpot: {
        category: 'WORKOUT',
        external_id: `${SEED_PREFIX}today`,
        name: 'E2E Sweet Spot',
        date: toLocalDate(sweetSpotDay),
        day: sweetSpotDay,
        type: 'Ride',
        description: SWEET_SPOT_DESCRIPTION,
      },
      endurance: {
        category: 'WORKOUT',
        external_id: `${SEED_PREFIX}next-month`,
        name: 'E2E Endurance',
        date: toLocalDate(enduranceDay),
        day: enduranceDay,
        type: 'Ride',
        description: ENDURANCE_DESCRIPTION,
      },
      race: {
        category: 'RACE_A',
        external_id: `${SEED_PREFIX}tomorrow-race`,
        name: 'E2E Goal Race',
        date: toLocalDate(raceDay),
        day: raceDay,
        type: 'Run',
      },
    },
    ride: {
      external_id: `${SEED_PREFIX}ride`,
      name: 'E2E Ride',
      date: toLocalDate(sweetSpotDay),
      day: sweetSpotDay,
      tcx: rideTcx(rideStart, RIDE_EFFORTS),
    },
    deleteWindow: {
      oldest: toLocalDate(new Date(year, month - 1, 1)),
      // Day 0 of a month is the last day of the month before it.
      newest: toLocalDate(new Date(year, month + 3, 0)),
    },
    isSeedOwned: item => item.external_id?.startsWith(SEED_PREFIX) ?? false,
  };
}

/**
 * A TCX bike ride from `start`, with a power sample every second through
 * each of `efforts` in turn.
 */
export function rideTcx(start: Date, efforts: RideEffort[]): string {
  const startTime = start.toISOString();
  const watts = efforts.flatMap(effort =>
    Array.from({ length: effort.seconds }, () => effort.watts),
  );
  const trackpoints = watts.map((power, second) =>
    [
      '<Trackpoint>',
      `<Time>${new Date(start.getTime() + second * 1000).toISOString()}</Time>`,
      `<Extensions><ns3:TPX><ns3:Watts>${power}</ns3:Watts></ns3:TPX></Extensions>`,
      '</Trackpoint>',
    ].join(''),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">',
    '<Activities>',
    '<Activity Sport="Biking">',
    `<Id>${startTime}</Id>`,
    `<Lap StartTime="${startTime}">`,
    `<TotalTimeSeconds>${watts.length}</TotalTimeSeconds>`,
    '<DistanceMeters>0</DistanceMeters>',
    '<Calories>0</Calories>',
    '<Intensity>Active</Intensity>',
    '<TriggerMethod>Manual</TriggerMethod>',
    '<Track>',
    ...trackpoints,
    '</Track>',
    '</Lap>',
    '</Activity>',
    '</Activities>',
    '</TrainingCenterDatabase>',
  ].join('\n');
}

function toLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
