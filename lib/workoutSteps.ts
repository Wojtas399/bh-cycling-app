import { isFiniteNumber } from './isFiniteNumber';
import { type StepSpan, resolvePowerTarget, toSpan } from './powerTarget';
import type { Zone, ZoneConfig } from './powerZones';
import { fromEntries } from './typed';
import { type WorkoutStep, isRepeat } from './workoutProfile';

export interface WorkoutDetailsPlainStep {
  key: string;
  type: 'step';
  role?: 'warmup' | 'cooldown';
  text?: string;
  durationSeconds?: number;
  zone?: Zone;
  ftpPct?: StepSpan;
  watts?: StepSpan;
  cadenceRpm?: StepSpan;
  ramp: boolean;
}

export interface WorkoutDetailsRepeat {
  key: string;
  type: 'repeat';
  reps: number;
  durationSeconds?: number;
  steps: WorkoutDetailsStep[];
}

export type WorkoutDetailsStep = WorkoutDetailsPlainStep | WorkoutDetailsRepeat;

function buildPlainStep(
  step: WorkoutStep,
  key: string,
  config: ZoneConfig,
): WorkoutDetailsPlainStep {
  return {
    key,
    type: 'step',
    ...propertyIfDefined('role', stepRole(step)),
    ...(step.text ? { text: step.text } : {}),
    ...(isFiniteNumber(step.duration)
      ? { durationSeconds: step.duration }
      : {}),
    ...(resolvePowerTarget(step.power, config) ?? {}),
    ...propertyIfDefined('watts', toSpan(step._power)),
    ...propertyIfDefined('cadenceRpm', toSpan(step.cadence)),
    ramp: step.ramp === true,
  };
}

function stepRole(step: WorkoutStep): WorkoutDetailsPlainStep['role'] {
  if (step.warmup) return 'warmup';

  if (step.cooldown) return 'cooldown';

  return undefined;
}

function repeatTotalSeconds(
  step: WorkoutStep,
  reps: number,
  children: WorkoutDetailsStep[],
): number | undefined {
  if (isFiniteNumber(step.duration)) return step.duration;

  const oneRepSeconds = children.map(child => child.durationSeconds);

  if (oneRepSeconds.length === 0 || !oneRepSeconds.every(isFiniteNumber)) {
    return undefined;
  }

  return reps * oneRepSeconds.reduce((sum, seconds) => sum + seconds, 0);
}

function buildStepKeyedByDocPosition(
  step: WorkoutStep,
  key: string,
  config: ZoneConfig,
): WorkoutDetailsStep {
  if (!isRepeat(step)) return buildPlainStep(step, key, config);

  const reps = Math.max(0, step.reps);
  const children = step.steps.map((child, index) =>
    buildStepKeyedByDocPosition(child, `${key}.${index}`, config),
  );

  return {
    key,
    type: 'repeat',
    reps,
    ...propertyIfDefined(
      'durationSeconds',
      repeatTotalSeconds(step, reps, children),
    ),
    steps: children,
  };
}

function propertyIfDefined<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : fromEntries([[key, value] as const]);
}

export function buildWorkoutSteps(
  docSteps: WorkoutStep[] | null | undefined,
  config: ZoneConfig,
): WorkoutDetailsStep[] {
  return (docSteps ?? []).map((step, index) =>
    buildStepKeyedByDocPosition(step, `${index}`, config),
  );
}
