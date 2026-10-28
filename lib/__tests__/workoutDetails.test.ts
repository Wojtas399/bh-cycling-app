import type {
  IntervalsActivity,
  IntervalsCalendarEvent,
} from '../intervalsApi';
import { resolveZoneConfig } from '../powerZones';
import { buildWorkoutDetails } from '../workoutDetails';

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
  type: 'WeightTraining',
  start_date_local: '2026-10-14T18:00:00',
  paired_event_id: 1,
  moving_time: 3500,
  distance: 0,
  icu_joules: 300000,
};

function details(
  workout: IntervalsCalendarEvent,
  activity: IntervalsActivity | null = null,
) {
  return buildWorkoutDetails(
    { event: workout, activity, zoneConfig: ZONE_CONFIG },
    TODAY,
  );
}

describe('buildWorkoutDetails', () => {
  describe('description', () => {
    it("is a ride's workout_doc notes, trimmed", () => {
      expect(details(ride).description).toBe('Ride notes');
    });

    it("is a non-cycling Workout's full event description, trimmed", () => {
      expect(details(strength).description).toBe(STRENGTH_DESCRIPTION);
    });

    it('is the same full description in completed mode', () => {
      const completed = details(strength, pairedActivity);

      expect(completed.mode).toBe('completed');
      expect(completed.description).toBe(STRENGTH_DESCRIPTION);
    });

    it('drops HTML tags but keeps their text and lines', () => {
      expect(
        details({
          ...strength,
          description: '<p>Rozgrzewka</p><b>OHP</b> 3x8<br>przerwy 60s',
        }).description,
      ).toBe('Rozgrzewka\nOHP 3x8\nprzerwy 60s');
    });

    it('is absent when the text is blank', () => {
      expect(details({ ...strength, description: ' \n ' })).not.toHaveProperty(
        'description',
      );
      expect(
        details({ ...ride, workout_doc: { description: '  ' } }),
      ).not.toHaveProperty('description');
      expect(
        details({ ...strength, description: '<p> </p>' }),
      ).not.toHaveProperty('description');
    });
  });

  it('tells a Cycling Workout from a non-cycling one', () => {
    expect(details(ride).isCyclingWorkout).toBe(true);
    expect(details(strength).isCyclingWorkout).toBe(false);
  });

  describe('steps, profile and work', () => {
    it('come from the step parse for a ride', () => {
      const planned = details(ride);

      expect(planned.blocks).toEqual([
        { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
      ]);
      expect(planned.profileSummary).toEqual({
        durationSeconds: 3600,
        stepCount: 1,
        peakFtpPct: expect.any(Number),
      });
      expect(planned.steps).toHaveLength(1);
      expect(planned.planMetrics).toEqual({
        durationSeconds: 3600,
        workKj: 540,
      });
      expect(
        details(ride, { ...pairedActivity, type: 'Ride' }).comparison?.rows,
      ).toEqual([
        { metric: 'duration', planned: 3600, actual: 3500, difference: -100 },
        { metric: 'work', planned: 540, actual: 300, difference: -240 },
      ]);
    });

    it('are left out for a non-cycling Workout in planned mode', () => {
      const planned = details(strength);

      expect(planned.blocks).toEqual([]);
      expect(planned.profileSummary).toBeNull();
      expect(planned.steps).toEqual([]);
      expect(planned.planMetrics).toEqual({ durationSeconds: 3600 });
    });

    it('are left out for a non-cycling Workout in completed mode', () => {
      const completed = details(strength, pairedActivity);

      expect(completed.blocks).toEqual([]);
      expect(completed.profileSummary).toBeNull();
      expect(completed.steps).toEqual([]);
      expect(completed.comparison?.rows).toEqual([
        { metric: 'duration', planned: 3600, actual: 3500, difference: -100 },
      ]);
    });
  });
});
