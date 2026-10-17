import { isFiniteNumber } from './isFiniteNumber';
import { type StepSpan, resolvePowerTarget, toSpan } from './powerTarget';
import type { Zone, ZoneConfig } from './powerZones';
import type { WorkoutStep } from './workoutProfile';

/** One plain step of the Kroki list: what to ride, and for how long. */
export interface WorkoutDetailsPlainStep {
  type: 'step';
  /** Set on a warm-up or cool-down, so it can be labelled without a `text`. */
  role?: 'warmup' | 'cooldown';
  /** The step's cue or label, absent when the doc gives none. */
  text?: string;
  durationSeconds?: number;
  /** Zone the step's bar is coloured by, absent without a power target. */
  zone?: Zone;
  /** The power target in %FTP. */
  ftpPct?: StepSpan;
  /** The power target in watts, when intervals.icu resolved it (`_power`). */
  watts?: StepSpan;
  /** The cadence target in rpm, when the step has one. */
  cadenceRpm?: StepSpan;
  /** The spans run as a linear ramp from `start` to `end`, not a range. */
  ramp: boolean;
}

/** A repeat of the Kroki list, kept nested: `reps` times its child steps. */
export interface WorkoutDetailsRepeat {
  type: 'repeat';
  reps: number;
  /** Total across all reps, absent when it can't be known. */
  durationSeconds?: number;
  /** The steps of a single rep, in order. */
  steps: WorkoutDetailsStep[];
}

/** One node of the Kroki tree. */
export type WorkoutDetailsStep = WorkoutDetailsPlainStep | WorkoutDetailsRepeat;

function buildPlainStep(
  step: WorkoutStep,
  config: ZoneConfig,
): WorkoutDetailsPlainStep {
  return {
    type: 'step',
    ...optional('role', stepRole(step)),
    ...(step.text ? { text: step.text } : {}),
    ...(isFiniteNumber(step.duration)
      ? { durationSeconds: step.duration }
      : {}),
    ...(resolvePowerTarget(step.power, config) ?? {}),
    ...optional('watts', toSpan(step._power)),
    ...optional('cadenceRpm', toSpan(step.cadence)),
    ramp: step.ramp === true,
  };
}

function stepRole(step: WorkoutStep): WorkoutDetailsPlainStep['role'] {
  if (step.warmup) return 'warmup';

  if (step.cooldown) return 'cooldown';

  return undefined;
}

/**
 * A repeat's total duration: the doc's own, which already covers every rep,
 * or `reps` times one rep when every step of the rep has a known length.
 */
function repeatDuration(
  step: WorkoutStep,
  reps: number,
  children: WorkoutDetailsStep[],
): number | undefined {
  if (isFiniteNumber(step.duration)) return step.duration;

  const rep = children.map(child => child.durationSeconds);

  if (rep.length === 0 || !rep.every(isFiniteNumber)) return undefined;

  return reps * rep.reduce((sum, seconds) => sum + seconds, 0);
}

function buildStep(step: WorkoutStep, config: ZoneConfig): WorkoutDetailsStep {
  // A repeat is recognised the same way the Workout Profile unrolls one.
  if (!isFiniteNumber(step.reps) || !step.steps) {
    return buildPlainStep(step, config);
  }

  const reps = Math.max(0, step.reps);
  const children = step.steps.map(child => buildStep(child, config));

  return {
    type: 'repeat',
    reps,
    ...optional('durationSeconds', repeatDuration(step, reps, children)),
    steps: children,
  };
}

/** `{ [key]: value }`, or nothing when there is no value. */
function optional<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

/**
 * Turns a Workout Doc's `steps[]` into the Kroki tree: the doc's own
 * structure, with repeats kept nested rather than expanded. Numbers only;
 * labels and units are left to the screen.
 */
export function buildWorkoutSteps(
  docSteps: WorkoutStep[] | null | undefined,
  config: ZoneConfig,
): WorkoutDetailsStep[] {
  return (docSteps ?? []).map(step => buildStep(step, config));
}
