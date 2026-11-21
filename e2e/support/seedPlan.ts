import type { LocalDateString } from '../../lib/localDate';

interface SeedEventBase {
  external_id: string;
  name: string;
  date: LocalDateString;
  day: Date;
}

export interface SeedWorkout extends SeedEventBase {
  category: 'WORKOUT';
  type: 'Ride';
  description: string;
}

export interface SeedNote extends SeedEventBase {
  category: 'NOTE';
  description: string;
}

export interface SeedRace extends SeedEventBase {
  category: 'RACE_A';
  type: 'Run';
}

export interface SeedRide {
  external_id: string;
  name: string;
  date: LocalDateString;
  day: Date;
  tcx: string;
}

export interface RideEffort {
  seconds: number;
  watts: number;
}

export interface SeedPlan {
  events: {
    sweetSpot: SeedWorkout;
    endurance: SeedWorkout;
    race: SeedRace;
    note: SeedNote;
  };
  ride: SeedRide;
  deleteWindow: { oldest: LocalDateString; newest: LocalDateString };
  isSeedOwned: (item: { external_id?: string | null }) => boolean;
}

const SEED_PREFIX = 'e2e-';

const SWEET_SPOT_IN_WORKOUT_SYNTAX = [
  'Warmup',
  '- 10m 50-65%',
  '',
  'Sweet spot',
  '- 30m 88-93%',
  '',
  'Cooldown',
  '- 10m 50%',
].join('\n');
const ENDURANCE_IN_WORKOUT_SYNTAX = ['Endurance', '- 90m 60-70%'].join('\n');

const RIDE_EFFORTS_THROUGH_SEVERAL_ZONES: RideEffort[] = [
  { seconds: 4 * 60, watts: 120 },
  { seconds: 4 * 60, watts: 170 },
  { seconds: 3 * 60, watts: 240 },
  { seconds: 2 * 60, watts: 320 },
  { seconds: 5 * 60, watts: 130 },
];

export function planSeed(today: Date): SeedPlan {
  const year = today.getFullYear();
  const month = today.getMonth();
  const sweetSpotDay = new Date(year, month, today.getDate());
  const enduranceDay = new Date(year, month + 1, 15);
  const raceDay = new Date(year, month, today.getDate() + 1);
  const rideStartAtLocalNoon = new Date(year, month, today.getDate(), 12);

  return {
    events: {
      sweetSpot: {
        category: 'WORKOUT',
        external_id: `${SEED_PREFIX}today`,
        name: 'E2E Sweet Spot',
        date: toLocalDate(sweetSpotDay),
        day: sweetSpotDay,
        type: 'Ride',
        description: SWEET_SPOT_IN_WORKOUT_SYNTAX,
      },
      endurance: {
        category: 'WORKOUT',
        external_id: `${SEED_PREFIX}next-month`,
        name: 'E2E Endurance',
        date: toLocalDate(enduranceDay),
        day: enduranceDay,
        type: 'Ride',
        description: ENDURANCE_IN_WORKOUT_SYNTAX,
      },
      race: {
        category: 'RACE_A',
        external_id: `${SEED_PREFIX}tomorrow-race`,
        name: 'E2E Goal Race',
        date: toLocalDate(raceDay),
        day: raceDay,
        type: 'Run',
      },
      note: {
        category: 'NOTE',
        external_id: `${SEED_PREFIX}today-note`,
        name: 'E2E Briefing',
        date: toLocalDate(sweetSpotDay),
        day: sweetSpotDay,
        description: 'Bring a spare tube and two bottles.',
      },
    },
    ride: {
      external_id: `${SEED_PREFIX}ride`,
      name: 'E2E Ride',
      date: toLocalDate(sweetSpotDay),
      day: sweetSpotDay,
      tcx: rideTcx(rideStartAtLocalNoon, RIDE_EFFORTS_THROUGH_SEVERAL_ZONES),
    },
    deleteWindow: {
      oldest: toLocalDate(new Date(year, month - 1, 1)),
      newest: toLocalDate(lastDayOfMonth(year, month + 2)),
    },
    isSeedOwned: item => item.external_id?.startsWith(SEED_PREFIX) ?? false,
  };
}

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

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function toLocalDate(date: Date): LocalDateString {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
