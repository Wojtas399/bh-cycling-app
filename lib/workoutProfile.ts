import type { Meters, Seconds } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { resolvePowerTarget } from './powerTarget';
import type { Zone, ZoneConfig } from './powerZones';

export interface StepTarget {
  units?: string;
  value?: number;
  start?: number;
  end?: number;
}

export type WattsStepTarget = StepTarget;

export interface WorkoutStep {
  text?: string;
  duration?: Seconds;
  distance?: Meters;
  reps?: number;
  steps?: WorkoutStep[];
  warmup?: boolean;
  cooldown?: boolean;
  ramp?: boolean;
  freeride?: boolean;
  maxeffort?: boolean;
  power?: StepTarget;
  hr?: StepTarget;
  cadence?: StepTarget;
  _power?: WattsStepTarget;
}

export interface WorkoutBlock {
  widthFraction: number;
  minPct: number;
  maxPct: number;
  zone: Zone;
  ramp?: RampEnds;
}

export interface RampEnds {
  startPct: number;
  endPct: number;
}

export const GAP_BAND = { minPct: 0, maxPct: 0, zone: 1 } as const;

type StepBand = Pick<WorkoutBlock, 'minPct' | 'maxPct' | 'zone' | 'ramp'>;

interface DrawableStep {
  durationSeconds: number;
  band: StepBand;
}

const MIN_VISIBLE_WIDTH_FRACTION = 0.01;

const MIN_DRAWABLE_DURATION_SHARE = 0.5;

function widthFractionsFlooredToVisible(secondsPerStep: number[]): number[] {
  const total = secondsPerStep.reduce((sum, seconds) => sum + seconds, 0);
  const fractions = secondsPerStep.map(seconds => seconds / total);
  const floorsAloneFillTheProfile =
    secondsPerStep.length * MIN_VISIBLE_WIDTH_FRACTION >= 1;

  if (floorsAloneFillTheProfile) return fractions;

  const ascending = fractions
    .map((_, index) => index)
    .sort((a, b) => fractions[a] - fractions[b]);

  let flooredCount = 0;
  let spareSum = 1;
  let scale = 1;

  for (const index of ascending) {
    scale = (1 - MIN_VISIBLE_WIDTH_FRACTION * flooredCount) / spareSum;

    if (fractions[index] * scale >= MIN_VISIBLE_WIDTH_FRACTION) break;

    flooredCount += 1;
    spareSum -= fractions[index];
  }

  const floored = new Set(ascending.slice(0, flooredCount));

  return fractions.map((fraction, index) =>
    floored.has(index) ? MIN_VISIBLE_WIDTH_FRACTION : fraction * scale,
  );
}

function resolveBandAboveAxis(
  step: WorkoutStep,
  config: ZoneConfig,
): StepBand | null {
  const power = resolvePowerTarget(step.power, config);

  if (!power) return null;

  const startPct = Math.max(0, power.ftpPct.start);
  const endPct = Math.max(0, power.ftpPct.end);
  const band: StepBand = {
    minPct: Math.min(startPct, endPct),
    maxPct: Math.max(startPct, endPct),
    zone: power.zone,
  };

  return step.ramp && startPct !== endPct
    ? { ...band, ramp: { startPct, endPct } }
    : band;
}

export type RepeatStep = WorkoutStep & { reps: number; steps: WorkoutStep[] };

export function isRepeat(step: WorkoutStep): step is RepeatStep {
  return isFiniteNumber(step.reps) && step.steps !== undefined;
}

export function unrollRepeats(steps: WorkoutStep[]): WorkoutStep[] {
  return steps.flatMap(step => {
    if (!isRepeat(step)) return [step];

    const rep = unrollRepeats(step.steps);

    return Array.from({ length: Math.max(0, step.reps) }, () => rep).flat();
  });
}

function hasPositiveDuration(
  step: Pick<WorkoutStep, 'duration'>,
): step is { duration: Seconds } {
  return isFiniteNumber(step.duration) && step.duration > 0;
}

function stepsWithLengthAndPlaceablePower(
  steps: WorkoutStep[],
  config: ZoneConfig,
): DrawableStep[] {
  return steps.flatMap(step => {
    const band = resolveBandAboveAxis(step, config);

    return band !== null && hasPositiveDuration(step)
      ? [{ durationSeconds: step.duration, band }]
      : [];
  });
}

export function buildWorkoutProfile(
  docSteps: WorkoutStep[] | null | undefined,
  config: ZoneConfig,
): WorkoutBlock[] {
  if (!docSteps || docSteps.length === 0) return [];

  const steps = unrollRepeats(docSteps);
  const drawable = stepsWithLengthAndPlaceablePower(steps, config);

  if (drawable.length === 0) return [];

  const drawableSeconds = drawable.reduce(
    (sum, step) => sum + step.durationSeconds,
    0,
  );
  const totalSeconds = steps
    .filter(hasPositiveDuration)
    .reduce((sum, step) => sum + step.duration, 0);

  if (drawableSeconds < totalSeconds * MIN_DRAWABLE_DURATION_SHARE) return [];

  const everyBlockIsFlatOnTheAxis = drawable.every(
    step => step.band.maxPct <= 0,
  );

  if (everyBlockIsFlatOnTheAxis) return [];

  const widthFractions = widthFractionsFlooredToVisible(
    drawable.map(step => step.durationSeconds),
  );

  return drawable.map(({ band }, index) => ({
    widthFraction: widthFractions[index],
    ...band,
  }));
}

export function profileCeilingPct(blocks: WorkoutBlock[]): number {
  return blocks.reduce((ceiling, block) => Math.max(ceiling, block.maxPct), 0);
}
