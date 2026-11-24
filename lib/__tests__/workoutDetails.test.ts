import { readCalendarRange } from '../calendarItems';
import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import type { LocalDateString } from '../localDate';
import { resolveZoneConfig } from '../powerZones';
import {
  type StoredWorkoutDetails,
  WORKOUT_DETAILS_ACTIVITY_FIELDS,
  type WorkoutDetails,
  buildWorkoutDetails,
} from '../workoutDetails';
import { fakeCalendarReads } from '@/test-utils/calendarItems';

const TODAY = '2026-10-14';
const ZONE_CONFIG = resolveZoneConfig({ powerZones: [60, 80, 95] });

const STRENGTH_DESCRIPTION = `Siłownia adaptacja 3

- Hipthrust 3x10, pauzą na górze 1s, 50-60%
- OHP 3x8, 1s
- przerwy 60s`;

function event(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Sample workout',
    start_date_local: '2026-10-15T08:00:00',
    moving_time: 3600,
    joules: 540000,
    workout_doc: {
      duration: 3600,
      description: '  Ride notes  ',
      steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
    },
    ...overrides,
  };
}

const ride = event({ type: 'Ride', description: 'Ride notes\n- 60m Z2' });
const strength = event({
  type: 'WeightTraining',
  description: `  ${STRENGTH_DESCRIPTION}\n`,
  workout_doc: {
    duration: 3600,
    description: 'Siłownia adaptacja 3',
    steps: [{ duration: 1, power: { units: '%ftp', start: 50, end: 60 } }],
  },
});

const pairedActivity: IntervalsActivity = {
  id: 'a1',
  name: 'Siłownia',
  type: 'WeightTraining',
  start_date_local: '2026-10-14T18:00:00',
  paired_event_id: 1,
  moving_time: 3500,
  distance: 0,
  icu_joules: 300000,
};

async function storedDetails(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  plannedDay: LocalDateString,
): Promise<StoredWorkoutDetails> {
  const paired = await readCalendarRange(
    fakeCalendarReads({ events, activities }),
    { oldest: plannedDay, newest: plannedDay },
    { activityFields: WORKOUT_DETAILS_ACTIVITY_FIELDS },
  );

  return { paired, rideSettings: { zoneConfig: ZONE_CONFIG, ftp: null } };
}

async function details(
  workout: IntervalsCalendarEvent,
  activity: IntervalsActivity | null = null,
): Promise<WorkoutDetails> {
  const built = buildWorkoutDetails(
    await storedDetails(
      [workout],
      activity ? [activity] : [],
      workout.start_date_local.slice(0, 10),
    ),
    workout.id,
    TODAY,
  );

  if (!built) throw new Error(`No Workout ${workout.id} in the read`);

  return built;
}

describe('buildWorkoutDetails', () => {
  describe('the Workout picked from the paired read', () => {
    it("opens a Workout ridden days after its planned day with that Activity's numbers", async () => {
      const opened = await details(
        event({ type: 'Ride', start_date_local: '2026-10-12T08:00:00' }),
        {
          ...pairedActivity,
          type: 'Ride',
          start_date_local: '2026-10-15T18:00:00',
          icu_training_load: 48,
        },
      );

      expect(opened).toMatchObject({
        mode: 'completed',
        status: 'completed',
        date: '2026-10-12',
        recordedActivityId: 'a1',
        activityMetrics: expect.arrayContaining([
          { metric: 'load', value: 48 },
        ]),
      });
    });

    it('is completed by an event naming an Activity beyond the read, with no numbers to show', async () => {
      expect(
        await details(
          event({
            type: 'Ride',
            start_date_local: '2026-10-12T08:00:00',
            paired_activity_id: 'a9',
          }),
        ),
      ).toMatchObject({
        mode: 'completed',
        status: 'completed',
        activityMetrics: null,
        recordedActivityId: null,
      });
    });

    it('is missed once its planned day has passed unpaired, and planned from today on', async () => {
      const unpaired = (start_date_local: string) =>
        details(event({ type: 'Ride', start_date_local }));

      expect((await unpaired('2026-10-13T08:00:00')).status).toBe('missed');
      expect((await unpaired('2026-10-14T08:00:00')).status).toBe('planned');
    });

    it('is null when the read holds no Workout with the id, as for a Race', async () => {
      const stored = await storedDetails(
        [event({ id: 5, category: 'RACE_A' }), event({ id: 7 })],
        [],
        '2026-10-15',
      );

      expect(buildWorkoutDetails(stored, 5, TODAY)).toBeNull();
      expect(buildWorkoutDetails(stored, 42, TODAY)).toBeNull();
    });
  });

  describe('description', () => {
    it("is a ride's workout_doc notes, trimmed", async () => {
      expect((await details(ride)).description).toBe('Ride notes');
    });

    it("is a non-cycling Workout's full event description, trimmed", async () => {
      expect((await details(strength)).description).toBe(STRENGTH_DESCRIPTION);
    });

    it('is the same full description in completed mode', async () => {
      const completed = await details(strength, pairedActivity);

      expect(completed.mode).toBe('completed');
      expect(completed.description).toBe(STRENGTH_DESCRIPTION);
    });

    it('drops HTML tags but keeps their text and lines', async () => {
      expect(
        (
          await details({
            ...strength,
            description: '<p>Rozgrzewka</p><b>OHP</b> 3x8<br>przerwy 60s',
          })
        ).description,
      ).toBe('Rozgrzewka\nOHP 3x8\nprzerwy 60s');
    });

    it('is absent when the text is blank', async () => {
      expect(
        await details({ ...strength, description: ' \n ' }),
      ).not.toHaveProperty('description');
      expect(
        await details({ ...ride, workout_doc: { description: '  ' } }),
      ).not.toHaveProperty('description');
      expect(
        await details({ ...strength, description: '<p> </p>' }),
      ).not.toHaveProperty('description');
    });
  });

  it('tells a Cycling Workout from a non-cycling one', async () => {
    expect((await details(ride)).isCyclingWorkout).toBe(true);
    expect((await details(strength)).isCyclingWorkout).toBe(false);
  });

  describe('steps, profile and work', () => {
    it('come from the step parse for a ride', async () => {
      const planned = await details(ride);

      expect(planned.rideSteps).toEqual([
        { duration: 3600, power: { units: 'power_zone', value: 2 } },
      ]);
      expect(planned.steps).toHaveLength(1);
      expect(planned.planMetrics).toEqual({
        durationSeconds: 3600,
        workKj: 540,
      });
      expect(
        (await details(ride, { ...pairedActivity, type: 'Ride' })).comparison
          ?.rows,
      ).toEqual([
        { metric: 'duration', planned: 3600, actual: 3500, difference: -100 },
        { metric: 'work', planned: 540, actual: 300, difference: -240 },
      ]);
    });

    it('are left out for a non-cycling Workout in planned mode', async () => {
      const planned = await details(strength);

      expect(planned.rideSteps).toEqual([]);
      expect(planned.steps).toEqual([]);
      expect(planned.planMetrics).toEqual({ durationSeconds: 3600 });
    });

    it('are left out for a non-cycling Workout in completed mode', async () => {
      const completed = await details(strength, pairedActivity);

      expect(completed.rideSteps).toEqual([]);
      expect(completed.steps).toEqual([]);
      expect(completed.comparison?.rows).toEqual([
        { metric: 'duration', planned: 3600, actual: 3500, difference: -100 },
      ]);
    });
  });

  describe('recordedActivityId', () => {
    it("is the paired Activity's id, to fetch its Activity Profile", async () => {
      expect(
        await details(ride, { ...pairedActivity, type: 'Ride' }),
      ).toMatchObject({
        mode: 'completed',
        recordedActivityId: 'a1',
      });
    });

    it('is null for a Workout without its Activity', async () => {
      expect((await details(ride)).recordedActivityId).toBeNull();
    });

    it('is null for a Strava Activity, which has no intervals to fetch', async () => {
      const strava = { ...pairedActivity, name: undefined, type: undefined };

      expect((await details(ride, strava)).recordedActivityId).toBeNull();
    });
  });

  describe('comparison compliance', () => {
    const rideActivity = { ...pairedActivity, type: 'Ride' };

    it("is intervals.icu's percentage, 0 included", async () => {
      expect(
        (await details(ride, { ...rideActivity, compliance: 0 })).comparison
          ?.compliance,
      ).toBe(0);
    });

    it.each([
      ["intervals.icu hasn't calculated it, sending null", null],
      ['the athlete asked intervals.icu to ignore it, sending a negative', -1],
    ])('is null when %s', async (_, compliance) => {
      expect(
        (await details(ride, { ...rideActivity, compliance })).comparison
          ?.compliance,
      ).toBeNull();
    });
  });
});
