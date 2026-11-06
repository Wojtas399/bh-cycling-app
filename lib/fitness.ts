import type { IntervalsWellness } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

/** One day's Fitness, Fatigue and Form, as whole numbers. */
export interface FitnessValues {
  fitness: number;
  fatigue: number;
  /** Fitness − Fatigue, from the rounded values. */
  form: number;
}

/**
 * A Wellness Entry's Fitness (`ctl`) and Fatigue (`atl`), rounded, and Form
 * from those rounded values, as the intervals.icu web app derives it. `null`
 * unless both are there: a missing value is no data, never `0`.
 */
export function toFitnessValues({
  ctl,
  atl,
}: Pick<IntervalsWellness, 'ctl' | 'atl'>): FitnessValues | null {
  if (!isFiniteNumber(ctl) || !isFiniteNumber(atl)) return null;

  const fitness = Math.round(ctl);
  const fatigue = Math.round(atl);

  return { fitness, fatigue, form: fitness - fatigue };
}

/**
 * Form as an absolute number with its sign: `+5`, `-12`, and `0` with none.
 * intervals.icu's "Form as a percentage" setting is ignored.
 */
export function formatForm(form: number): string {
  return form > 0 ? `+${form}` : `${form}`;
}
