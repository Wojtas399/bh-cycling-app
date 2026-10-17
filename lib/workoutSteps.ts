import {
  type Zone,
  type ZoneConfig,
  bandForZone,
  zoneForFtpPercent,
} from './powerZones';
import type { StepTarget, WorkoutStep } from './workoutProfile';

/**
 * A target as a span, in its step's order: a range or ramp runs `start` to
 * `end`, and a single value has `start === end`.
 */
export interface StepSpan {
  start: number;
  end: number;
}

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

function isUsableNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Reads a target as a span. A range (or ramp) wins over a single value, as in
 * the Workout Profile; a range with one end missing collapses to the other.
 */
function toSpan(target: StepTarget | undefined): StepSpan | undefined {
  if (!target) return undefined;

  const start = isUsableNumber(target.start) ? target.start : undefined;
  const end = isUsableNumber(target.end) ? target.end : undefined;

  if (start !== undefined || end !== undefined) {
    return { start: start ?? end!, end: end ?? start! };
  }

  if (isUsableNumber(target.value)) {
    return { start: target.value, end: target.value };
  }

  return undefined;
}

/**
 * The step's power target in %FTP and the zone it is coloured by. A
 * `power_zone` target reads as that zone's band; a `%ftp` span is coloured by
 * its middle, as in the Workout Profile. Any other unit has no %FTP reading.
 */
function resolvePower(
  target: StepTarget | undefined,
  config: ZoneConfig,
): Pick<WorkoutDetailsPlainStep, 'zone' | 'ftpPct'> {
  if (target?.units === 'power_zone' && isUsableNumber(target.value)) {
    const band = bandForZone(target.value, config);

    return {
      zone: band.zone,
      ftpPct: { start: band.minPct, end: band.maxPct },
    };
  }

  const ftpPct = target?.units === '%ftp' ? toSpan(target) : undefined;

  if (!ftpPct) return {};

  return {
    zone: zoneForFtpPercent((ftpPct.start + ftpPct.end) / 2, config),
    ftpPct,
  };
}

function buildPlainStep(
  step: WorkoutStep,
  config: ZoneConfig,
): WorkoutDetailsPlainStep {
  return {
    type: 'step',
    ...optional('role', stepRole(step)),
    ...(step.text ? { text: step.text } : {}),
    ...(isUsableNumber(step.duration)
      ? { durationSeconds: step.duration }
      : {}),
    ...resolvePower(step.power, config),
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
  if (isUsableNumber(step.duration)) return step.duration;

  const rep = children.map(child => child.durationSeconds);

  if (rep.length === 0 || !rep.every(isUsableNumber)) return undefined;

  return reps * rep.reduce((sum, seconds) => sum + seconds, 0);
}

function buildStep(step: WorkoutStep, config: ZoneConfig): WorkoutDetailsStep {
  // A repeat is recognised the same way the Workout Profile unrolls one.
  if (!isUsableNumber(step.reps) || !step.steps) {
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
